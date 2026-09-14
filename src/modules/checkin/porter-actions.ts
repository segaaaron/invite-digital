'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { checkin, events, plans, porters } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/modules/identity/session-cookie'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import type { DoorActionState, ScanInput } from './actions'
import type { ScanOutcome } from './application/check-in-by-scan'
import type { PorterAccessError, PorterSession } from './application/porter-use-cases'

// ─────────────────────────────────────────────────────────────────────────────
// Del panel: sumar y quitar porteros. Las pide el anfitrión, su dueño o el admin, con la
// sección `cliente`; el personal de puerta con cuenta no pasa.
// ─────────────────────────────────────────────────────────────────────────────

export type PorterActionState =
  | { status: 'idle' }
  | { status: 'created'; nombre: string; enlace: string; pin: string; whatsapp: string | null }
  | { status: 'removed' }
  | { status: 'error'; message: string }

const texto = (formData: FormData, clave: string): string => {
  const valor = formData.get(clave)
  return typeof valor === 'string' ? valor : ''
}

export async function addPorterAction(_previous: PorterActionState, formData: FormData): Promise<PorterActionState> {
  const actor = await requireSession()
  const eventId = texto(formData, 'eventId')
  const eventSlug = texto(formData, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })

  // Los porteros solo existen con puerta: sin el modo puerta en el plan no hay a qué entrar.
  const puerta = await plans.requireFeature(eventId, 'checkin')
  if (isErr(puerta)) return { status: 'error', message: 'Tu plan no incluye pases con QR ni porteros.' }

  const capacidad = await plans.allowanceFor(eventId)
  if (isErr(capacidad)) return { status: 'error', message: 'No pudimos leer tu plan. Vuelve a intentarlo en un momento.' }

  const alta = await porters.add({
    eventId,
    limit: capacidad.value.maxDoorPorters,
    createdByUserId: actor.userId,
    name: texto(formData, 'name'),
    phone: texto(formData, 'phone'),
    gate: texto(formData, 'gate'),
  })
  if (isErr(alta)) return { status: 'error', message: alta.error.detail }

  const evento = await events.getByIdUnscoped(eventId)
  const titulo = isErr(evento) ? 'el evento' : evento.value.title
  const enlace = `${env.SITE_URL.replace(/\/+$/, '')}/p/${alta.value.token}`
  const nombre = texto(formData, 'name').trim()
  const telefono = texto(formData, 'phone').trim()

  revalidatePath(`/panel/eventos/${eventSlug}/porteros`)
  return {
    status: 'created',
    nombre,
    enlace,
    pin: alta.value.pin,
    whatsapp:
      telefono === ''
        ? null
        : enlaceWhatsapp(
            telefono,
            `Hola ${nombre}, este es tu acceso a la puerta de ${titulo}: ${enlace} · PIN ${alta.value.pin}. Funciona el día del evento.`,
          ),
  }
}

export async function removePorterAction(_previous: PorterActionState, formData: FormData): Promise<PorterActionState> {
  const actor = await requireSession()
  const eventId = texto(formData, 'eventId')
  const eventSlug = texto(formData, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'cliente' })

  const quitado = await porters.revoke(eventId, texto(formData, 'porterId'))
  if (!quitado) return { status: 'error', message: 'Ese portero ya no estaba en la puerta.' }

  revalidatePath(`/panel/eventos/${eventSlug}/porteros`)
  return { status: 'removed' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Del portero. **Sin sesión**: se autorizan con su enlace y su PIN, y el servidor vuelve a
// comprobarlo en cada petición. El evento **sale del portero**, nunca del navegador.
// ─────────────────────────────────────────────────────────────────────────────

const PORTER_COOKIE = 'door_porter'

/** Cinco PIN por minuto y por IP, además de los cinco intentos por portero que cuenta la base. */
const limitePin = createRateLimiter({ windowMs: 60_000, max: 5 })

const MENSAJE: Record<PorterAccessError, string> = {
  invalido: 'Ese PIN no es correcto.',
  bloqueado: 'Demasiados intentos. Vuelve a intentarlo en 15 minutos.',
  fuera_de_horario: 'Este acceso todavía no está abierto o ya cerró: funciona el día del evento.',
  quitado: 'Este acceso ya no está disponible.',
}

export type PinState = { status: 'idle' } | { status: 'error'; message: string }

export async function enterAsPorterAction(_previous: PinState, formData: FormData): Promise<PinState> {
  const token = texto(formData, 'token')
  const cabeceras = await headers()
  const ip = clientIpFrom({ realIp: cabeceras.get('x-real-ip'), forwardedFor: cabeceras.get('x-forwarded-for') })
  if (limitePin.isLimited(`pin:${ip}`, Date.now())) return { status: 'error', message: 'Demasiados intentos. Espera un minuto.' }

  const entrada = await porters.enter({ token, pin: texto(formData, 'pin') })
  if (isErr(entrada)) return { status: 'error', message: MENSAJE[entrada.error] }

  const jar = await cookies()
  // La ventana la corta el servidor en cada petición; la cookie solo evita pedir el PIN otra vez.
  jar.set(PORTER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.SITE_URL.startsWith('https://'),
    path: '/p',
    maxAge: 24 * 60 * 60,
  })

  // Redirige en vez de revalidar: la cookie tiene que viajar en esta misma respuesta.
  redirect(`/p/${token}/puerta`)
}

/** El portero de esta petición, o `null`. Nunca lanza por un acceso caducado: responde. */
async function porteroActual(): Promise<PorterSession | null> {
  const token = (await cookies()).get(PORTER_COOKIE)?.value
  if (!token) return null
  const quien = await porters.resolve(token)
  if (isErr(quien)) return null
  // Si el plan dejó de traer la puerta, el portero tampoco entra.
  const puerta = await plans.requireFeature(quien.value.eventId, 'checkin')
  return isErr(puerta) ? null : quien.value
}

/** Si el acceso del portero sigue abierto. La puerta lo pregunta cuando el servidor rechaza. */
export async function porterAccessOkAction(): Promise<boolean> {
  return (await porteroActual()) !== null
}

export async function recordScansAsPorterAction(input: { scans: ScanInput[] }): Promise<ScanOutcome[]> {
  const portero = await porteroActual()
  // Lanza, como las acciones de la puerta del panel: el dispositivo guarda el escaneo en su
  // bandeja de salida y lo reintenta, y la pantalla vuelve a pedir el PIN.
  if (portero === null) throw new Error('porter_denied')

  const result = await checkin.record({
    eventId: portero.eventId,
    recordedBy: `porter:${portero.porterId}`,
    scans: input.scans.map((s) => ({ scanId: s.scanId, scanned: s.scanned, arrivedCount: s.arrivedCount, scannedAt: new Date(s.scannedAtMs) })),
  })
  if (isErr(result)) {
    console.error('registro del portero rechazado', result.error.kind, result.error.detail)
    throw new Error(result.error.kind)
  }
  return result.value
}

export async function checkInByGroupAsPorterAction(input: {
  groupId: string
  scanId: string
  arrivedCount: number | null
  scannedAtMs: number
}): Promise<ScanOutcome> {
  const portero = await porteroActual()
  if (portero === null) throw new Error('porter_denied')

  const result = await checkin.recordGroup({
    eventId: portero.eventId,
    recordedBy: `porter:${portero.porterId}`,
    scan: { scanId: input.scanId, groupId: input.groupId, arrivedCount: input.arrivedCount, scannedAt: new Date(input.scannedAtMs) },
  })
  if (isErr(result)) {
    console.error('registro por grupo del portero rechazado', result.error.kind, result.error.detail)
    throw new Error(result.error.kind)
  }
  return result.value
}

export async function adjustArrivalAsPorterAction(input: { scanId: string; arrivedCount: number }): Promise<DoorActionState> {
  const portero = await porteroActual()
  if (portero === null) return { status: 'error', kind: 'not_found' }

  const result = await checkin.adjust({ eventId: portero.eventId, scanId: input.scanId, arrivedCount: input.arrivedCount })
  return isErr(result) ? { status: 'error', kind: result.error.kind } : { status: 'success' }
}

export async function voidArrivalAsPorterAction(input: { scanId: string }): Promise<DoorActionState> {
  const portero = await porteroActual()
  if (portero === null) return { status: 'error', kind: 'not_found' }

  const result = await checkin.void({ eventId: portero.eventId, scanId: input.scanId })
  return isErr(result) ? { status: 'error', kind: result.error.kind } : { status: 'success' }
}

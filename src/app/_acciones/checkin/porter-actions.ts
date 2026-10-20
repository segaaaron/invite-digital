'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { checkin, events, plans, porters } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { cuboDeLaPeticion } from '@/shared/http/client-ip'
import { createRateLimiter } from '@/shared/http/rate-limit'
import { env } from '@/shared/config/env'
import { err, isErr, ok, type Result } from '@/shared/result'
import { enlaceWhatsapp } from '@/shared/whatsapp'
import type { DoorActionState, ScanInput } from '@/app/_acciones/checkin/actions'
import type { ScanOutcome } from '@/modules/checkin/application/check-in-by-scan'
import type { PorterAccessError, PorterSession } from '@/modules/checkin/application/porter-use-cases'
import { registrarFallo } from '@/shared/observability/fallos'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'
import type { T } from '@/shared/i18n/t'

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
  const t = await tr()
  const actor = await requireSession()
  const eventId = texto(formData, 'eventId')
  const eventSlug = texto(formData, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'porteros' })

  // Los porteros solo existen con puerta: sin el modo puerta en el plan no hay a qué entrar.
  const puerta = await plans.requireFeature(eventId, 'checkin')
  if (isErr(puerta)) return { status: 'error', message: t('Tu plan no incluye pases con QR ni personal de recepción.', 'Your plan doesn’t include QR passes or reception staff.') }

  const capacidad = await plans.allowanceFor(eventId)
  if (isErr(capacidad)) return { status: 'error', message: t('No pudimos leer tu plan. Vuelve a intentarlo en un momento.', 'We couldn’t read your plan. Try again in a moment.') }

  const alta = await porters.add({
    eventId,
    limit: capacidad.value.maxDoorPorters,
    createdByUserId: actor.userId,
    name: texto(formData, 'name'),
    phone: texto(formData, 'phone'),
    gate: texto(formData, 'gate'),
  })
  if (isErr(alta)) return { status: 'error', message: traducir(alta.error.detail, t) }

  const evento = await events.getByIdUnscoped(eventId)
  const titulo = isErr(evento) ? t('el evento', 'the event') : evento.value.title
  const enlace = `${env.SITE_URL.replace(/\/+$/, '')}/p/${alta.value.token}`
  const nombre = texto(formData, 'name').trim()
  const telefono = texto(formData, 'phone').trim()

  revalidatePath(`/panel/eventos/${eventSlug}/equipo`)
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
            t(`Hola ${nombre}, este es tu acceso a la puerta de ${titulo}: ${enlace} · PIN ${alta.value.pin}. Funciona el día del evento.`, `Hi ${nombre}, this is your door access for ${titulo}: ${enlace} · PIN ${alta.value.pin}. It works on the day of the event.`),
          ),
  }
}

export async function removePorterAction(_previous: PorterActionState, formData: FormData): Promise<PorterActionState> {
  const t = await tr()
  const actor = await requireSession()
  const eventId = texto(formData, 'eventId')
  const eventSlug = texto(formData, 'eventSlug')
  await requireEventAccess(actor, { eventId, eventSlug, section: 'porteros' })

  const quitado = await porters.revoke(eventId, texto(formData, 'porterId'))
  if (!quitado) return { status: 'error', message: t('Esa persona ya no estaba en recepción.', 'That person was no longer at reception.') }

  revalidatePath(`/panel/eventos/${eventSlug}/equipo`)
  return { status: 'removed' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Del portero. **Sin sesión**: se autorizan con su enlace y su PIN, y el servidor vuelve a
// comprobarlo en cada petición. El evento **sale del portero**, nunca del navegador.
// ─────────────────────────────────────────────────────────────────────────────

const PORTER_COOKIE = 'door_porter'

/**
 * Cinco PIN por minuto **por enlace y por IP**, además de los cinco intentos por portero que
 * cuenta la base y bloquean 15 minutos.
 *
 * Por IP a secas castigaba a los inocentes: en una fiesta todos los porteros salen por el wifi
 * del salón, así que el cuarto en llegar a su puerta leía «espera un minuto» sin haber fallado
 * un PIN. Partir el cupo por enlace no afloja la defensa —adivinar seis dígitos sigue costando
 * cinco intentos por minuto contra **ese** portero, y la base lo bloquea a los cinco fallos—,
 * solo deja de contar juntos a quienes no tienen nada que ver.
 *
 * La clave lleva el hash del token, no el token: ni en memoria hace falta tenerlo en claro.
 */
const limitePin = createRateLimiter({ windowMs: 60_000, max: 5 })
const cuboDelPin = (ip: string, token: string): string => `pin:${ip}:${createHash('sha256').update(token).digest('hex').slice(0, 16)}`

/**
 * Y un techo de la IP, holgado, que ninguna puerta de verdad roza: contar **solo** por enlace
 * dejaba a cada token inventado estrenando cubo, así que `/p/<cualquier-cosa>` admitía POST sin
 * freno y cada uno es una consulta a Postgres. Treinta por minuto son seis porteros escribiendo
 * su PIN cinco veces cada uno.
 */
const topeDeLaIp = createRateLimiter({ windowMs: 60_000, max: 30 })

const mensajeDe = (t: T): Record<PorterAccessError, string> => ({
  invalido: t('Ese PIN no es correcto.', 'That PIN is not correct.'),
  bloqueado: t('Demasiados intentos. Vuelve a intentarlo en 15 minutos.', 'Too many attempts. Try again in 15 minutes.'),
  fuera_de_horario: t('Este acceso todavía no está abierto o ya cerró: funciona el día del evento.', 'This access is not open yet or has already closed: it works on the day of the event.'),
  quitado: t('Este acceso ya no está disponible.', 'This access is no longer available.'),
})

export type PinState = { status: 'idle' } | { status: 'error'; message: string }

export async function enterAsPorterAction(_previous: PinState, formData: FormData): Promise<PinState> {
  const t = await tr()
  const token = texto(formData, 'token')
  const cabeceras = await headers()
  const ip = cuboDeLaPeticion({ realIp: cabeceras.get('x-real-ip'), forwardedFor: cabeceras.get('x-forwarded-for') })
  const ahora = Date.now()
  if (limitePin.isLimited(cuboDelPin(ip, token), ahora) || topeDeLaIp.isLimited(`pin-ip:${ip}`, ahora)) return { status: 'error', message: t('Demasiados intentos. Espera un minuto.', 'Too many attempts. Wait a minute.') }

  const entrada = await porters.enter({ token, pin: texto(formData, 'pin') })
  if (isErr(entrada)) return { status: 'error', message: mensajeDe(t)[entrada.error] }

  const jar = await cookies()
  // La cookie es una sesión firmada por el servidor —la única prueba de que se escribió el
  // PIN—, nunca el token del enlace: ese lo tiene cualquiera a quien se lo reenvíen.
  jar.set(PORTER_COOKIE, entrada.value.cookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.SITE_URL.startsWith('https://'),
    path: '/p',
    maxAge: 24 * 60 * 60,
  })

  // Redirige en vez de revalidar: la cookie tiene que viajar en esta misma respuesta.
  redirect(`/p/${token}/puerta`)
}

/**
 * El acceso del portero en esta petición, **con el motivo** cuando no lo tiene: una sesión
 * caducada se arregla escribiendo otra vez el PIN y un acceso quitado no, así que aplanarlos
 * a «null» hacía que la puerta diera el consejo equivocado.
 */
async function accesoActual(): Promise<Result<PorterSession, PorterAccessError>> {
  const sesion = (await cookies()).get(PORTER_COOKIE)?.value
  if (sesion === undefined || sesion === '') return err('invalido')

  const quien = await porters.resolve(sesion)
  if (isErr(quien)) {
    // Una cookie que no verifica con cookie presente: o caducó, o alguien puso el token del
    // enlace a mano (lo que F3/F4/F6 cierran), o cambió el secreto del servidor y están
    // cayéndose todos los porteros a la vez. Sin esta línea, nada de eso se ve en el panel.
    if (quien.error === 'invalido') registrarFallo('checkin/porter-actions', 'no se pudo verificar la sesión de puerta', 'invalido', 'cookie presente que no verifica')
    return quien
  }

  // Si el plan dejó de traer la puerta, el portero tampoco entra.
  const puerta = await plans.requireFeature(quien.value.eventId, 'checkin')
  return isErr(puerta) ? err('quitado') : ok(quien.value)
}

/** El portero de esta petición, o `null`. Nunca lanza por un acceso caducado: responde. */
async function porteroActual(): Promise<PorterSession | null> {
  const acceso = await accesoActual()
  return isErr(acceso) ? null : acceso.value
}

/**
 * Si el acceso del portero sigue abierto y, si no, por qué. La puerta lo pregunta cuando el
 * servidor rechaza, para decirle qué hacer en vez de un «se cerró» que no siempre es verdad.
 */
export async function porterAccessAction(): Promise<{ ok: true } | { ok: false; motivo: PorterAccessError }> {
  const acceso = await accesoActual()
  return isErr(acceso) ? { ok: false, motivo: acceso.error } : { ok: true }
}

export async function recordScansAsPorterAction(input: { scans: ScanInput[] }): Promise<ScanOutcome[]> {
  const portero = await porteroActual()
  // Lanza, como las acciones de la puerta del panel: el dispositivo guarda el escaneo en su
  // bandeja de salida y lo reintenta, y la pantalla vuelve a pedir el PIN.
  if (portero === null) throw new Error('porter_denied')

  const result = await checkin.record({
    eventId: portero.eventId,
    recordedBy: `porter:${portero.porterId}`,
    scans: input.scans.map((s) => ({ scanId: s.scanId, scanned: s.scanned, arrivedCount: s.arrivedCount, scannedAt: new Date(s.scannedAtMs), personIds: s.personIds ?? null })),
  })
  if (isErr(result)) {
    registrarFallo('checkin/porter-actions', 'registro del portero rechazado', result.error.kind, result.error.detail)
    throw new Error(result.error.kind)
  }
  return result.value
}

export async function checkInByGroupAsPorterAction(input: {
  groupId: string
  scanId: string
  arrivedCount: number | null
  scannedAtMs: number
  personIds?: readonly string[] | null
}): Promise<ScanOutcome> {
  const portero = await porteroActual()
  if (portero === null) throw new Error('porter_denied')

  const result = await checkin.recordGroup({
    eventId: portero.eventId,
    recordedBy: `porter:${portero.porterId}`,
    scan: { scanId: input.scanId, groupId: input.groupId, arrivedCount: input.arrivedCount, scannedAt: new Date(input.scannedAtMs), personIds: input.personIds ?? null },
  })
  if (isErr(result)) {
    registrarFallo('checkin/porter-actions', 'registro por grupo del portero rechazado', result.error.kind, result.error.detail)
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

'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { acceptsResponses } from '@/modules/events'
import { events, guests, plans } from '@/app/composition/container'
import { requireEventAccess, requireSession } from '@/app/_acciones/sesion'
import { invitationUrl } from '@/modules/guests'
import { env } from '@/shared/config/env'
import { campo } from '@/shared/forms/campo'
import { fechaEnBolivia } from '@/shared/format/fecha'
import { clientIpFrom } from '@/shared/http/client-ip'
import { createRateLimiter } from '@/shared/http/rate-limit'
import { registrarFallo } from '@/shared/observability/fallos'
import { isErr } from '@/shared/result'
import { encargoSinTerminar } from './puede-invitar'

// ============================================================================
// El enlace general (`0086`): uno por evento, para quien no quiere cargar invitados. Cada
// invitado escribe su nombre y quiénes van con él, y sale con **su** invitación personal.
//
// Arriba, lo del anfitrión (crear y quitar). Abajo, el alta pública: sin sesión, con límite por
// IP, y con las mismas puertas que repartir (invitación escrita, encargo aprobado y pagado, tope
// del plan).
// ============================================================================

export type EnlaceGeneralState = { status: 'idle' | 'success' | 'error'; message: string; url?: string }

export async function crearEnlaceGeneralAction(_previo: EnlaceGeneralState, formData: FormData): Promise<EnlaceGeneralState> {
  const actor = await requireSession()
  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventId: campo(formData, 'eventId'), eventSlug, section: 'cliente' })
  const token = await guests.general.crear(eventId)
  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  return { status: 'success', message: 'Enlace general listo. Si ya habías compartido uno, ese dejó de abrir.', url: urlGeneral(token) }
}

export async function quitarEnlaceGeneralAction(_previo: EnlaceGeneralState, formData: FormData): Promise<EnlaceGeneralState> {
  const actor = await requireSession()
  const eventSlug = campo(formData, 'eventSlug')
  const eventId = await requireEventAccess(actor, { eventId: campo(formData, 'eventId'), eventSlug, section: 'cliente' })
  await guests.general.quitar(eventId)
  revalidatePath(`/panel/eventos/${eventSlug}/invitados`)
  return { status: 'success', message: 'Enlace general quitado: ya no abre. Las invitaciones que salieron de él siguen.' }
}

const urlGeneral = (token: string) => `${env.SITE_URL.replace(/\/+$/, '')}/abierta/${token}`

// --- Público ------------------------------------------------------------------

/** Cinco altas por minuto e IP: una familia entera desde un mismo WiFi cabe; un bot, no. */
const limite = createRateLimiter({ windowMs: 60_000, max: 5 })
const MAX_ACOMPANANTES = 10

export type AltaGeneralState = { status: 'idle' } | { status: 'error'; code: 'cerrado' | 'lleno' | 'nombre' | 'acompanantes' | 'limite' | 'fallo' }

export async function altaConEnlaceGeneralAction(_previo: AltaGeneralState, formData: FormData): Promise<AltaGeneralState> {
  const bolsa = await headers()
  if (limite.isLimited(clientIpFrom({ realIp: bolsa.get('x-real-ip'), forwardedFor: bolsa.get('x-forwarded-for') }), Date.now())) {
    return { status: 'error', code: 'limite' }
  }

  // Enlace desconocido o quitado: lo mismo que cerrado. Distinguirlo confirmaría que existe.
  const eventId = await guests.general.resolver(campo(formData, 'token'))
  if (eventId === null) return { status: 'error', code: 'cerrado' }
  const evento = await events.getByIdUnscoped(eventId)
  // Un borrador se publica al dar de alta (como al repartir); uno cerrado no se reabre.
  if (isErr(evento) || evento.value.status === 'closed' || !acceptsResponses({ ...evento.value, status: 'live' }, fechaEnBolivia(new Date()))) {
    return { status: 'error', code: 'cerrado' }
  }
  if ((await encargoSinTerminar(eventId)) !== null) return { status: 'error', code: 'cerrado' }

  const nombre = campo(formData, 'nombre').replace(/\s+/g, ' ').trim()
  if (nombre.length < 2 || nombre.length > 120) return { status: 'error', code: 'nombre' }
  const acompanantes = campo(formData, 'acompanantes')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l !== '')
  if (acompanantes.length > MAX_ACOMPANANTES || acompanantes.some((a) => a.length > 120)) return { status: 'error', code: 'acompanantes' }

  // El tope del plan, como en el alta del panel: si no se puede leer, no se da de alta.
  const [capacidad, actuales] = await Promise.all([plans.allowanceFor(eventId), guests.list(eventId)])
  if (isErr(capacidad) || isErr(actuales)) return { status: 'error', code: 'fallo' }

  const alta = await guests.addGuest({
    eventId,
    fullName: nombre,
    companionNames: acompanantes,
    attending: null,
    dietaryNote: null,
    phone: null,
    email: null,
    vip: false,
    allowance: { maxGuestGroups: capacidad.value.maxGuestGroups },
    currentGroups: actuales.value.length,
  })
  if (isErr(alta)) {
    if (alta.error.kind === 'plan_limit_reached') return { status: 'error', code: 'lleno' }
    registrarFallo('guests/enlace-general', 'no se pudo dar de alta desde el enlace general', alta.error.kind, alta.error.detail)
    return { status: 'error', code: 'fallo' }
  }

  await events.publicarSiBorrador(eventId)
  const enlace = await guests.enviar({ eventId, id: alta.value.groupId })
  if (isErr(enlace)) {
    registrarFallo('guests/enlace-general', 'no se pudo acuñar el enlace del invitado', enlace.error.kind, enlace.error.detail)
    return { status: 'error', code: 'fallo' }
  }
  // A su invitación personal: ahí confirma, como cualquier invitado cargado a mano.
  redirect(new URL(invitationUrl(enlace.value.token, env.SITE_URL)).pathname)
}

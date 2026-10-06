'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { guests, plans, rsvp } from '@/app/composition/container'
import { eventUnlocked } from '@/app/_acciones/events/actions'
import { clientIpFrom } from '@/shared/http/client-ip'
import { isErr } from '@/shared/result'
import { createRateLimiter } from '@/shared/http/rate-limit'
import { guardedRespond, type RsvpOutcome } from '@/modules/rsvp/application/guarded-respond'
import { campo } from '@/shared/forms/campo'
import { avisarALosAnfitriones, avisarDelMensaje } from '@/app/_acciones/avisar-a-los-anfitriones'
import { registrarFallo } from '@/shared/observability/fallos'

export type RsvpActionState = RsvpOutcome | { status: 'idle' }

// Diez respuestas por minuto y por IP: un grupo grande cambiando de opinión cabe de
// sobra; la fuerza bruta sobre tokens, no.
const respond = guardedRespond({
  limiter: createRateLimiter({ windowMs: 60_000, max: 10 }),
  respond: (input) => rsvp.respond(input),
  clock: () => Date.now(),
  log: (message, kind, detail) => registrarFallo('rsvp/actions', message, kind, detail),
})

/**
 * Sin libro de firmas en el plan, la confirmación llega **sin mensaje**: el campo no se pinta, y
 * esto es el corte de verdad (la acción es un extremo público). Si no se puede leer el plan, se
 * deja pasar: perder un mensaje es peor que guardar uno de más.
 */
async function sinMensajeSiNoHayLibro(eventId: string, formData: FormData): Promise<void> {
  if (isErr(await plans.requireFeature(eventId, 'guestbook'))) formData.delete('message')
}

export type FirmaState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: 'rate_limited' | 'invalid_payload' | 'invitation_not_found' | 'already_answered' }

const limiteDelLibro = createRateLimiter({ windowMs: 60_000, max: 10 })

/** El tope del mensaje, el mismo que el de la respuesta (`rsvp-response.ts`). */
const MAX_FIRMA = 500

/**
 * Firmar el libro de firmas, **después de confirmar**. Antes reusaba la confirmación: como se
 * contesta una sola vez, tras confirmar se rechazaba («ya se confirmó»), y antes de confirmar
 * confirmaba todos los lugares. Ahora escribe solo el mensaje en la respuesta ya dada.
 *
 * Mismas guardas que responder: límite por IP, candado de la contraseña del evento y el libro
 * en el plan (es un extremo HTTP público).
 */
export async function firmarLibroAction(_previous: FirmaState, formData: FormData): Promise<FirmaState> {
  const headerBag = await headers()
  const ip = clientIpFrom({ realIp: headerBag.get('x-real-ip'), forwardedFor: headerBag.get('x-forwarded-for') })
  if (limiteDelLibro.isLimited(ip, Date.now())) return { status: 'error', message: 'rate_limited' }

  const token = campo(formData, 'token')
  const mensaje = campo(formData, 'message').trim()
  if (mensaje.length === 0 || mensaje.length > MAX_FIRMA) return { status: 'error', message: 'invalid_payload' }

  const group = await guests.resolveByToken(token)
  if (isErr(group) || !(await eventUnlocked(group.value.eventId))) return { status: 'error', message: 'invitation_not_found' }
  if (isErr(await plans.requireFeature(group.value.eventId, 'guestbook'))) return { status: 'error', message: 'invalid_payload' }

  if (!(await rsvp.firmarLibro(group.value.id, mensaje))) return { status: 'error', message: 'already_answered' }
  revalidatePath(`/i/${token}`)
  avisarDelMensaje({ eventId: group.value.eventId, invitado: group.value.label, texto: mensaje })
  return { status: 'success' }
}

/** Mismo cupo que la respuesta de siempre: diez por minuto y por IP. */
const limitePorPersona = createRateLimiter({ windowMs: 60_000, max: 10 })

export async function respondAction(_previous: RsvpActionState, formData: FormData): Promise<RsvpActionState> {
  const headerBag = await headers()
  const ip = clientIpFrom({ realIp: headerBag.get('x-real-ip'), forwardedFor: headerBag.get('x-forwarded-for') })
  const token = campo(formData, 'token')

  // El candado del evento protegido cierra también **las escrituras**. La página del
  // invitado es un render; esto es un extremo HTTP público, y con el enlace en la mano se
  // podría confirmar sin pasar nunca por la puerta de la contraseña.
  const group = await guests.resolveByToken(token)
  if (!isErr(group) && !(await eventUnlocked(group.value.eventId))) {
    // El mismo `not_found` que da un token desconocido: distinguir «existe pero está
    // cerrado» de «no existe» confirmaría que el enlace es bueno.
    return { status: 'error', message: 'invitation_not_found' }
  }
  if (!isErr(group)) await sinMensajeSiNoHayLibro(group.value.eventId, formData)

  // `acts` son casillas: llegan varias con el mismo nombre y `fromEntries` se quedaría con la última.
  const outcome = await respond({ ip, token, payload: { ...Object.fromEntries(formData), acts: formData.getAll('acts') } })
  if (outcome.status === 'success') {
    revalidatePath(`/i/${token}`)
    if (!isErr(group)) {
      avisarALosAnfitriones({ eventId: group.value.eventId, invitado: group.value.label, asistentes: outcome.attending, mensaje: campo(formData, 'message') || null })
    }
  }
  return outcome
}

/**
 * La confirmación **nombre por nombre**, desde `/i/<token>/confirmar`.
 *
 * Lleva las mismas guardas que la de siempre: límite por IP, candado de la contraseña del
 * evento —esto es un extremo HTTP público, no un render— y una sola respuesta por grupo. Los
 * identificadores de persona que llegan se cotejan contra las personas de **ese** grupo en el
 * caso de uso; aquí no se confía en nada de lo que venga del formulario.
 */
export async function respondByPersonAction(_previous: RsvpActionState, formData: FormData): Promise<RsvpActionState> {
  const headerBag = await headers()
  const ip = clientIpFrom({ realIp: headerBag.get('x-real-ip'), forwardedFor: headerBag.get('x-forwarded-for') })
  if (limitePorPersona.isLimited(ip, Date.now())) return { status: 'error', message: 'rate_limited' }

  const token = campo(formData, 'token')
  const group = await guests.resolveByToken(token)
  if (!isErr(group) && !(await eventUnlocked(group.value.eventId))) {
    return { status: 'error', message: 'invitation_not_found' }
  }
  if (!isErr(group)) await sinMensajeSiNoHayLibro(group.value.eventId, formData)

  const extra = Number(campo(formData, 'extra'))
  const resultado = await rsvp.respondByPerson({
    token,
    // «Vienen todos» del atajo de la pareja: el formulario no manda identificadores, los
    // resuelve el caso de uso con las personas de ese grupo.
    todos: campo(formData, 'todos') === 'si',
    vienen: formData.getAll('vienen').filter((v): v is string => typeof v === 'string'),
    extra: Number.isFinite(extra) ? extra : 0,
    responderName: campo(formData, 'name') || null,
    message: campo(formData, 'message') || null,
    extras: { song: campo(formData, 'song') || null, menu: campo(formData, 'menu') || null, acts: formData.getAll('acts').filter((a): a is string => typeof a === 'string') },
  })

  if (isErr(resultado)) {
    // El detalle puede llevar identificadores: se queda en el registro del servidor.
    registrarFallo('rsvp/actions', 'confirmación por persona rechazada', resultado.error.kind, resultado.error.detail)
    return { status: 'error', message: resultado.error.kind }
  }

  revalidatePath(`/i/${token}`)
  revalidatePath(`/i/${token}/confirmar`)
  if (!isErr(group)) {
    avisarALosAnfitriones({ eventId: group.value.eventId, invitado: group.value.label, asistentes: resultado.value.attending, mensaje: campo(formData, 'message') || null })
  }
  return { status: 'success', attending: resultado.value.attending, responderName: resultado.value.responderName }
}

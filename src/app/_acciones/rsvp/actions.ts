'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { guests, rsvp } from '@/app/composition/container'
import { eventUnlocked } from '@/app/_acciones/events/actions'
import { clientIpFrom } from '@/shared/http/client-ip'
import { isErr } from '@/shared/result'
import { createRateLimiter } from '@/shared/http/rate-limit'
import { guardedRespond, type RsvpOutcome } from '@/modules/rsvp/application/guarded-respond'
import { campo } from '@/shared/forms/campo'

export type RsvpActionState = RsvpOutcome | { status: 'idle' }

// Diez respuestas por minuto y por IP: un grupo grande cambiando de opinión cabe de
// sobra; la fuerza bruta sobre tokens, no.
const respond = guardedRespond({
  limiter: createRateLimiter({ windowMs: 60_000, max: 10 }),
  respond: (input) => rsvp.respond(input),
  clock: () => Date.now(),
  log: (message, kind, detail) => console.error(message, kind, detail),
})

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

  const outcome = await respond({ ip, token, payload: Object.fromEntries(formData) })
  if (outcome.status === 'success') revalidatePath(`/i/${token}`)
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
  })

  if (isErr(resultado)) {
    // El detalle puede llevar identificadores: se queda en el registro del servidor.
    console.error('confirmación por persona rechazada', resultado.error.kind, resultado.error.detail)
    return { status: 'error', message: resultado.error.kind }
  }

  revalidatePath(`/i/${token}`)
  revalidatePath(`/i/${token}/confirmar`)
  return { status: 'success', attending: resultado.value.attending, responderName: resultado.value.responderName }
}

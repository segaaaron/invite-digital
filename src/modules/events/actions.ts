'use server'

import { createHmac } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { events as eventUseCases, guests } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'
import { shareUrl } from './domain/client-share'
import type { EventErrorKind } from './domain/errors'

export type EventActionState = { status: 'idle' | 'error' | 'success'; message: EventErrorKind | '' }

const readForm = (formData: FormData) => ({
  slug: String(formData.get('slug') ?? ''),
  title: String(formData.get('title') ?? ''),
  eventDate: String(formData.get('eventDate') ?? ''),
  rsvpDeadline: String(formData.get('rsvpDeadline') ?? ''),
  locale: String(formData.get('locale') ?? 'es'),
  themeKey: String(formData.get('themeKey') ?? 'clasico'),
  status: String(formData.get('status') ?? 'draft'),
  retentionDays: Number(formData.get('retentionDays') ?? 90),
  currency: String(formData.get('currency') ?? 'BOB'),
})

// Cada acción empieza por requireSession: una Server Action es un extremo HTTP público,
// y que el formulario viva tras el inicio de sesión no la protege.
export async function createEventAction(_previous: EventActionState, formData: FormData): Promise<EventActionState> {
  await requireSession()

  const result = await eventUseCases.create(readForm(formData))
  if (isErr(result)) {
    console.error('alta de evento rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  revalidatePath('/panel')
  return { status: 'success', message: '' }
}

export async function updateEventAction(_previous: EventActionState, formData: FormData): Promise<EventActionState> {
  await requireSession()

  const result = await eventUseCases.update({ ...readForm(formData), id: String(formData.get('id') ?? '') })
  if (isErr(result)) {
    console.error('edición de evento rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.kind }
  }

  revalidatePath('/panel')
  revalidatePath(`/panel/eventos/${result.value.slug}`)
  return { status: 'success', message: '' }
}

export type ClientShareState =
  | { status: 'idle' }
  // Igual que el enlace del invitado: viaja al cliente una sola vez, porque en la base
  // solo queda el hash.
  | { status: 'success'; url: string; expiresAt: string }
  | { status: 'error' }

export async function createClientShareAction(_previous: ClientShareState, formData: FormData): Promise<ClientShareState> {
  await requireSession()

  const eventSlug = String(formData.get('eventSlug') ?? '')
  const result = await eventUseCases.createShare({ eventId: String(formData.get('eventId') ?? '') })

  if (isErr(result)) {
    console.error('alta de enlace de cliente rechazada', result.error.kind, result.error.detail)
    return { status: 'error' }
  }

  revalidatePath(`/panel/eventos/${eventSlug}`)
  return {
    status: 'success',
    url: shareUrl(result.value.token, env.SITE_URL),
    expiresAt: result.value.expiresAt.toISOString().slice(0, 10),
  }
}

export type RevokeShareState = { status: 'idle' } | { status: 'success' } | { status: 'error' }

/**
 * Devuelve estado, no `void`. Antes, si la revocación fallaba, el panel volvía a
 * pintarse igual y el enlace del cliente seguía vivo sin que nadie lo supiera.
 */
export async function revokeClientShareAction(
  _previous: RevokeShareState,
  formData: FormData,
): Promise<RevokeShareState> {
  await requireSession()

  const result = await eventUseCases.revokeShare(String(formData.get('shareId') ?? ''))
  if (isErr(result)) {
    console.error('revocación de enlace rechazada', result.error.kind, result.error.detail)
    return { status: 'error' }
  }

  revalidatePath(`/panel/eventos/${String(formData.get('eventSlug') ?? '')}`)
  return { status: 'success' }
}

export type DeleteEventState = { status: 'idle' } | { status: 'error'; message: string }

/**
 * Borra un evento entero, con el identificador escrito a mano como confirmación.
 *
 * Al terminar redirige a la bandeja: quedarse en la página de un evento que ya no existe
 * daría un 404 justo después de una acción destructiva, y parecería que algo falló.
 */
export async function deleteEventAction(
  _previous: DeleteEventState,
  formData: FormData,
): Promise<DeleteEventState> {
  await requireSession()

  const result = await eventUseCases.remove({
    eventId: String(formData.get('eventId') ?? ''),
    confirmation: String(formData.get('confirmation') ?? ''),
  })

  if (isErr(result)) {
    console.error('borrado de evento rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  redirect('/panel')
}

export type UnlockState = { status: 'idle' } | { status: 'error'; message: string }

/** Cuánto dura el desbloqueo de un evento protegido. Una tarde entera de fiesta cabe. */
const UNLOCK_HOURS = 12

const unlockCookieName = (eventId: string): string => `evento-abierto-${eventId}`

/**
 * Comprueba la contraseña de un evento y, si es la buena, deja una cookie de sesión para
 * ese evento y solo para ese.
 *
 * La cookie guarda el hash del identificador del evento con el secreto del servidor: una
 * cookie fabricada a mano no abre nada. Y el mensaje de error es siempre el mismo, sin
 * distinguir enlace inválido de contraseña incorrecta: distinguirlos confirmaría que el
 * enlace existe.
 */
export async function unlockEventAction(_previous: UnlockState, formData: FormData): Promise<UnlockState> {
  const token = String(formData.get('token') ?? '')
  const password = String(formData.get('password') ?? '')

  const group = await guests.resolveByToken(token)
  if (isErr(group)) return { status: 'error', message: 'No pudimos abrir la invitación con esos datos.' }

  const correcta = await eventUseCases.checkPassword({ eventId: group.value.eventId, password })
  if (isErr(correcta) || !correcta.value) {
    return { status: 'error', message: 'No pudimos abrir la invitación con esos datos.' }
  }

  const hash = await eventUseCases.passwordHashOf(group.value.eventId)
  const jar = await cookies()
  jar.set(unlockCookieName(group.value.eventId), unlockValue(group.value.eventId, hash), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.SITE_URL.startsWith('https://'),
    path: '/',
    maxAge: UNLOCK_HOURS * 60 * 60,
  })

  // Redirige en vez de revalidar: la cookie se escribe en esta misma respuesta, y
  // revalidar el árbol dentro de la propia acción lo vuelve a pintar **antes** de que el
  // navegador tenga la cookie, así que la puerta seguía cerrada tras acertar.
  redirect(`/i/${token}`)
}

/**
 * El valor de la cookie: HMAC del identificador del evento con **el hash de su propia
 * contraseña** como clave.
 *
 * Así, cambiar la contraseña invalida por sí sola todos los desbloqueos repartidos, sin
 * inventar otro secreto que alguien tendría que rotar. Y una cookie fabricada a mano no
 * abre nada: quien la escribe no conoce el hash.
 */
function unlockValue(eventId: string, passwordHash: string | null): string {
  return createHmac('sha256', passwordHash ?? 'evento-publico').update(eventId).digest('base64url')
}

/** ¿Este navegador ya escribió la contraseña de este evento? */
export async function eventUnlocked(eventId: string): Promise<boolean> {
  const hash = await eventUseCases.passwordHashOf(eventId)
  // Sin contraseña no hay puerta que abrir: el evento es público con el enlace.
  if (hash === null) return true

  const jar = await cookies()
  return jar.get(unlockCookieName(eventId))?.value === unlockValue(eventId, hash)
}

export type PrivacyState = { status: 'idle' } | { status: 'success' } | { status: 'error'; message: string }

/**
 * Pone o quita la contraseña del evento. Elegir «pública» borra el hash, y con él quedan
 * inservibles todos los desbloqueos repartidos, porque la cookie se firma con ese hash.
 */
export async function setEventPrivacyAction(_previous: PrivacyState, formData: FormData): Promise<PrivacyState> {
  await requireSession()

  const eventId = String(formData.get('eventId') ?? '')
  const eventSlug = String(formData.get('eventSlug') ?? '')
  const publica = formData.get('privacy') !== 'password'
  const password = String(formData.get('password') ?? '')

  const result = await eventUseCases.setPassword({ eventId, password: publica ? null : password })
  if (isErr(result)) {
    console.error('privacidad rechazada', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${eventSlug}/configuracion`)
  return { status: 'success' }
}

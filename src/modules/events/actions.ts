'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { events as eventUseCases, guests } from '@/app/composition/container'
import { clientIpFrom } from '@/modules/leads/application/client-ip'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'
import { guardedUnlock } from './application/guarded-unlock'
import { isUnlockValid, unlockValue, UNLOCK_MS } from './domain/unlock-token'
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
  messageTemplate: String(formData.get('messageTemplate') ?? ''),
  venue: String(formData.get('venue') ?? ''),
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

/**
 * Cinco intentos por minuto y por IP, veinte por minuto y por evento.
 *
 * Un invitado que se equivoca al teclear cabe de sobra; probar contraseñas de seis
 * caracteres a fuerza bruta, no. El límite por evento existe porque un ataque distribuido
 * cambia de IP en cada intento, y cada intento cuesta un argon2 de 19 MiB.
 */
const abrirEvento = guardedUnlock({
  limiter: createRateLimiter({ windowMs: 60_000, max: 5 }),
  eventLimiter: createRateLimiter({ windowMs: 60_000, max: 20 }),
  check: async ({ eventId, password }) => {
    const correcta = await eventUseCases.checkPassword({ eventId, password })
    return !isErr(correcta) && correcta.value
  },
  clock: () => Date.now(),
})

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

  const cabeceras = await headers()
  const ip = clientIpFrom({
    realIp: cabeceras.get('x-real-ip'),
    forwardedFor: cabeceras.get('x-forwarded-for'),
  })

  const intento = await abrirEvento({ ip, eventId: group.value.eventId, password })

  if (intento.status === 'rate_limited') {
    return { status: 'error', message: 'Demasiados intentos. Espera un minuto y vuelve a probar.' }
  }
  if (intento.status === 'invalid') {
    return { status: 'error', message: 'No pudimos abrir la invitación con esos datos.' }
  }

  const hash = await eventUseCases.passwordHashOf(group.value.eventId)
  const jar = await cookies()
  jar.set(
    unlockCookieName(group.value.eventId),
    unlockValue({ eventId: group.value.eventId, passwordHash: hash ?? '', issuedAt: Date.now() }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.SITE_URL.startsWith('https://'),
      path: '/',
      maxAge: Math.floor(UNLOCK_MS / 1000),
    },
  )

  // Redirige en vez de revalidar: la cookie se escribe en esta misma respuesta, y
  // revalidar el árbol dentro de la propia acción lo vuelve a pintar **antes** de que el
  // navegador tenga la cookie, así que la puerta seguía cerrada tras acertar.
  redirect(`/i/${token}`)
}


/**
 * ¿Este navegador ya escribió la contraseña de este evento?
 *
 * La caducidad la comprueba **el servidor**, con la marca de tiempo que va firmada dentro
 * del valor: el `maxAge` de la cookie lo controla el navegador y quien la copie se lo
 * salta.
 */
export async function eventUnlocked(eventId: string): Promise<boolean> {
  const hash = await eventUseCases.passwordHashOf(eventId)
  // Sin contraseña no hay puerta que abrir: el evento es público con el enlace.
  if (hash === null) return true

  const jar = await cookies()
  const valor = jar.get(unlockCookieName(eventId))?.value
  return valor !== undefined && isUnlockValid({ value: valor, eventId, passwordHash: hash, now: Date.now() })
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

/**
 * Cambia la moneda del evento desde la cabecera de la mesa de regalos.
 *
 * Los importes ya guardados no se convierten: son centavos, no una cantidad con moneda.
 * Cambiar la moneda **reetiqueta** lo que hay, y quien la cambia tiene que saberlo — el
 * propio selector lo dice.
 */
export async function setEventCurrencyAction(input: {
  eventId: string
  eventSlug: string
  currency: string
}): Promise<{ status: 'success' } | { status: 'error'; message: string }> {
  await requireSession()

  const row = await eventUseCases.getById(input.eventId)
  if (isErr(row)) return { status: 'error', message: row.error.detail }

  const result = await eventUseCases.update({ ...row.value, currency: input.currency })
  if (isErr(result)) {
    console.error('cambio de moneda rechazado', result.error.kind, result.error.detail)
    return { status: 'error', message: result.error.detail }
  }

  revalidatePath(`/panel/eventos/${input.eventSlug}/regalos`)
  return { status: 'success' }
}

import type { RateLimiter } from '@/modules/leads/application/rate-limit'

export type UnlockOutcome = { status: 'ok' } | { status: 'invalid' } | { status: 'rate_limited' }

/**
 * La puerta de la contraseña de un evento, con límite de intentos.
 *
 * `unlockEventAction` es un extremo HTTP **público y sin sesión** contra una contraseña
 * de seis caracteres: sin límite, probarlas todas es cuestión de tiempo. Y cada intento
 * cuesta un argon2 —19 MiB y dos pasadas—, así que la fuerza bruta también sirve para
 * tumbar el servidor.
 *
 * Se cuenta por IP **y por evento**: un ataque distribuido cambia de IP en cada intento,
 * y lo que hay que proteger es el evento. Cuando está limitado **no se comprueba nada**,
 * que es justo el punto: no gastar el argon2.
 */
export const guardedUnlock =
  (deps: {
    limiter: RateLimiter
    /** Límite por evento. Sin él solo se cuenta por IP. */
    eventLimiter?: RateLimiter
    check: (input: { eventId: string; password: string }) => Promise<boolean>
    clock: () => number
  }) =>
  async (input: { ip: string; eventId: string; password: string }): Promise<UnlockOutcome> => {
    const ahora = deps.clock()

    if (deps.limiter.isLimited(input.ip, ahora)) return { status: 'rate_limited' }
    if (deps.eventLimiter?.isLimited(input.eventId, ahora) === true) return { status: 'rate_limited' }

    const correcta = await deps.check({ eventId: input.eventId, password: input.password })
    return correcta ? { status: 'ok' } : { status: 'invalid' }
  }

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type SessionWindow = { readonly expiresAt: Date }

export const isSessionExpired = (session: SessionWindow, now: Date): boolean =>
  session.expiresAt.getTime() <= now.getTime()

export const nextExpiry = (now: Date): Date => new Date(now.getTime() + SESSION_TTL_MS)

/**
 * Renovación deslizante: la caducidad se empuja solo cuando ya se gastó más de la mitad
 * de la ventana, para no escribir en la base en cada petición del panel.
 */
export const shouldRenew = (session: SessionWindow, now: Date): boolean =>
  session.expiresAt.getTime() - now.getTime() < SESSION_TTL_MS / 2

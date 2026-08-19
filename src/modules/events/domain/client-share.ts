export type ClientShareWindow = { readonly expiresAt: Date; readonly revokedAt: Date | null }

export const DEFAULT_SHARE_DAYS = 60

/** Un enlace caducado y uno revocado son lo mismo de cara afuera: no sirve. */
export const isShareUsable = (share: ClientShareWindow, now: Date): boolean =>
  share.revokedAt === null && share.expiresAt.getTime() > now.getTime()

export const shareExpiry = (now: Date, days: number): Date => new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

export const shareUrl = (token: string, siteUrl: string): string => `${siteUrl.replace(/\/+$/, '')}/compartir/${token}`

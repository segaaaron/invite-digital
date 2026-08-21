import { describe, expect, it } from 'vitest'
import { DEFAULT_SHARE_DAYS, isShareUsable, shareExpiry, shareUrl } from './client-share'

const NOW = new Date('2026-08-19T12:00:00Z')

describe('enlace del cliente', () => {
  it('sirve mientras no haya caducado ni se haya revocado', () => {
    expect(isShareUsable({ expiresAt: new Date('2026-09-01T00:00:00Z'), revokedAt: null }, NOW)).toBe(true)
  })

  it('no sirve si caducó', () => {
    expect(isShareUsable({ expiresAt: new Date('2026-08-01T00:00:00Z'), revokedAt: null }, NOW)).toBe(false)
  })

  it('no sirve si se revocó, aunque no haya caducado', () => {
    expect(isShareUsable({ expiresAt: new Date('2026-09-01T00:00:00Z'), revokedAt: NOW }, NOW)).toBe(false)
  })

  it('la caducidad por defecto son 60 días', () => {
    expect(shareExpiry(NOW, DEFAULT_SHARE_DAYS).toISOString()).toBe('2026-10-18T12:00:00.000Z')
  })

  it('construye la URL sin barra doble', () => {
    expect(shareUrl('abc', 'https://invitepremium.bo/')).toBe('https://invitepremium.bo/compartir/abc')
  })
})

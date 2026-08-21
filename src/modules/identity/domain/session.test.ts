import { describe, expect, it } from 'vitest'
import { SESSION_TTL_MS, isSessionExpired, nextExpiry, shouldRenew } from './session'

const at = (iso: string) => new Date(iso)

describe('sesión', () => {
  it('caduca cuando la fecha ya pasó', () => {
    expect(isSessionExpired({ expiresAt: at('2026-08-19T10:00:00Z') }, at('2026-08-19T10:00:01Z'))).toBe(true)
    expect(isSessionExpired({ expiresAt: at('2026-08-19T10:00:00Z') }, at('2026-08-19T09:59:59Z'))).toBe(false)
  })

  it('la próxima caducidad son 30 días', () => {
    expect(nextExpiry(at('2026-08-19T00:00:00Z')).getTime() - at('2026-08-19T00:00:00Z').getTime()).toBe(SESSION_TTL_MS)
  })

  it('renueva solo cuando queda menos de la mitad de la ventana', () => {
    const now = at('2026-08-19T00:00:00Z')
    const casiNueva = { expiresAt: new Date(now.getTime() + SESSION_TTL_MS - 60_000) }
    const gastada = { expiresAt: new Date(now.getTime() + SESSION_TTL_MS / 4) }
    expect(shouldRenew(casiNueva, now)).toBe(false)
    expect(shouldRenew(gastada, now)).toBe(true)
  })
})

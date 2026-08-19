import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { SESSION_TTL_MS } from '../domain/session'
import { authenticateSession } from './authenticate-session'
import type { SessionRepository, TokenMinter } from './ports'

const NOW = new Date('2026-08-19T12:00:00Z')
const minter: TokenMinter = { mint: () => ({ token: 't', hash: Buffer.alloc(32, 1) }), hashOf: () => Buffer.alloc(32, 1) }

const repo = (row: { id: string; userId: string; expiresAt: Date } | null) => {
  const touched: Array<{ id: string; expiresAt: Date }> = []
  const sessions: SessionRepository = {
    create: async () => {},
    findByTokenHash: async () => row,
    touch: async (id, expiresAt) => void touched.push({ id, expiresAt }),
    deleteByTokenHash: async () => {},
    deleteExpired: async () => 0,
  }
  return { sessions, touched }
}

describe('authenticateSession', () => {
  it('rechaza una cookie ausente sin tocar la base', async () => {
    const { sessions, touched } = repo(null)
    const result = await authenticateSession({ sessions, minter, clock: () => NOW })(null)
    expect(isErr(result) && result.error.kind).toBe('session_expired')
    expect(touched).toHaveLength(0)
  })

  it('renueva la sesión gastada y devuelve la nueva caducidad', async () => {
    const { sessions, touched } = repo({ id: 's1', userId: 'u1', expiresAt: new Date(NOW.getTime() + SESSION_TTL_MS / 4) })
    const result = await authenticateSession({ sessions, minter, clock: () => NOW })('token')
    expect(isOk(result) && result.value.userId).toBe('u1')
    expect(touched).toHaveLength(1)
  })

  it('no escribe cuando la sesión aún está fresca', async () => {
    const { sessions, touched } = repo({ id: 's1', userId: 'u1', expiresAt: new Date(NOW.getTime() + SESSION_TTL_MS - 1000) })
    const result = await authenticateSession({ sessions, minter, clock: () => NOW })('token')
    expect(isOk(result) && result.value.renewedUntil).toBeNull()
    expect(touched).toHaveLength(0)
  })

  it('rechaza una sesión caducada', async () => {
    const { sessions } = repo({ id: 's1', userId: 'u1', expiresAt: new Date(NOW.getTime() - 1) })
    const result = await authenticateSession({ sessions, minter, clock: () => NOW })('token')
    expect(isErr(result) && result.error.kind).toBe('session_expired')
  })
})

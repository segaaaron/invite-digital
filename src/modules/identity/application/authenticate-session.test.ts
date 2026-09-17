import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { SESSION_TTL_MS } from '../domain/session'
import { authenticateSession } from './authenticate-session'
import type { SessionRepository, TokenMinter } from './ports'

const NOW = new Date('2026-08-19T12:00:00Z')
const minter: TokenMinter = { mint: () => ({ token: 't', hash: Buffer.alloc(32, 1) }), hashOf: () => Buffer.alloc(32, 1) }

const repo = (row: { id: string; userId: string; expiresAt: Date; supportSessionId?: string | null; lastSeenAt?: Date | null } | null) => {
  const touched: Array<{ id: string; expiresAt: Date }> = []
  const vistas: string[] = []
  const sessions: SessionRepository = {
    create: async () => {},
    findByTokenHash: async () => row,
    touch: async (id, expiresAt) => void touched.push({ id, expiresAt }),
    deleteByTokenHash: async () => {},
    deleteExpired: async () => 0,
    deleteByUser: async () => {},
    setDevice: async () => {},
    seen: async (id) => void vistas.push(id),
    listByUser: async () => [],
    deleteOthers: async () => {},
  }
  return { sessions, touched, vistas }
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
    // El id de la sesión viaja: el modo soporte vive en ella.
    expect(isOk(result) && result.value.sessionId).toBe('s1')
    expect(touched).toHaveLength(0)
  })

  it('dice si la sesión está en modo soporte, sin otra consulta', async () => {
    const { sessions } = repo({ id: 's1', userId: 'u1', expiresAt: new Date(NOW.getTime() + SESSION_TTL_MS - 1000), supportSessionId: 'sp1' })
    const result = await authenticateSession({ sessions, minter, clock: () => NOW })('token')
    expect(isOk(result) && result.value.supportSessionId).toBe('sp1')
    const sinSoporte = await authenticateSession({ sessions: repo({ id: 's2', userId: 'u1', expiresAt: new Date(NOW.getTime() + SESSION_TTL_MS - 1000) }).sessions, minter, clock: () => NOW })('token')
    expect(isOk(sinSoporte) && sinSoporte.value.supportSessionId).toBeNull()
  })

  // «Último uso» en la lista de sesiones de Mi cuenta, sin escribir en cada petición.
  it('apunta el último uso si pasaron cinco minutos, y no antes', async () => {
    const fresca = new Date(NOW.getTime() + SESSION_TTL_MS - 1000)
    const vieja = repo({ id: 's1', userId: 'u1', expiresAt: fresca, lastSeenAt: new Date(NOW.getTime() - 6 * 60_000) })
    await authenticateSession({ sessions: vieja.sessions, minter, clock: () => NOW })('token')
    expect(vieja.vistas).toEqual(['s1'])

    const reciente = repo({ id: 's2', userId: 'u1', expiresAt: fresca, lastSeenAt: new Date(NOW.getTime() - 60_000) })
    await authenticateSession({ sessions: reciente.sessions, minter, clock: () => NOW })('token')
    expect(reciente.vistas).toEqual([])
  })

  it('rechaza una sesión caducada', async () => {
    const { sessions } = repo({ id: 's1', userId: 'u1', expiresAt: new Date(NOW.getTime() - 1) })
    const result = await authenticateSession({ sessions, minter, clock: () => NOW })('token')
    expect(isErr(result) && result.error.kind).toBe('session_expired')
  })
})

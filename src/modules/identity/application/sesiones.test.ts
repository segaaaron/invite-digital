import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { closeOtherSessions } from './password-reset-use-cases'
import type { PasswordResetRepository, SessionRepository, TokenMinter } from './ports'

const NOW = new Date('2026-09-16T20:00:00Z')
const minter: TokenMinter = { mint: () => ({ token: 't', hash: Buffer.alloc(0) }), hashOf: (t) => Buffer.from(`h:${t}`) }

function dobles(codigo: string) {
  const vivas = new Set(['actual', 'tia', 'prima'])
  const intentos: string[] = []
  const sessions = {
    deleteOthers: async (_userId: string, keep: string) => {
      for (const id of [...vivas]) if (id !== keep) vivas.delete(id)
    },
  } as unknown as SessionRepository
  const resets: PasswordResetRepository = {
    issue: async () => {},
    findLive: async () => ({ id: 'r1', codeHash: Buffer.from(`h:${codigo}`), expiresAt: new Date(NOW.getTime() + 60_000), consumedAt: null, attempts: 0 }),
    countAttempt: async (id) => void intentos.push(id),
    consume: async () => {},
    deleteExpired: async () => 0,
  }
  return { sessions, resets, vivas, intentos }
}

/**
 * Con la contraseña compartida todos entran como la misma cuenta: lo único que distingue al
 * dueño es su correo. Cerrar las demás sesiones pide el código que llega ahí.
 */
describe('closeOtherSessions', () => {
  it('con el código del correo cierra las demás y deja la propia', async () => {
    const d = dobles('123456')
    const r = await closeOtherSessions({ ...d, minter, clock: () => NOW })({ userId: 'u1', sessionId: 'actual', code: '123 456' })
    expect(isOk(r)).toBe(true)
    expect([...d.vivas]).toEqual(['actual'])
  })

  it('sin el código correcto no cierra nada y cuenta el intento', async () => {
    const d = dobles('123456')
    const r = await closeOtherSessions({ ...d, minter, clock: () => NOW })({ userId: 'u1', sessionId: 'actual', code: '000000' })
    expect(isErr(r)).toBe(true)
    expect(d.vivas.size).toBe(3)
    expect(d.intentos).toEqual(['r1'])
  })
})

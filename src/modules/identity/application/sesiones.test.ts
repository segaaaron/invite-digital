import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { changeEmail, closeOtherSessions } from './password-reset-use-cases'
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

/**
 * Cambiar el correo de la cuenta (16 oct): como cerrar las demás sesiones, lo autoriza el código que llega al correo
 * **actual** —con la contraseña compartida, cualquiera que entra podría quedarse con la cuenta—, y el nuevo no puede
 * ser el de otra cuenta.
 */
describe('changeEmail', () => {
  const deps = (codigo: string, ocupados: Record<string, string> = {}) => {
    const d = dobles(codigo)
    const cambios: { userId: string; email: string }[] = []
    const consumidos: string[] = []
    return {
      ...d,
      cambios,
      consumidos,
      resets: { ...d.resets, consume: async (id: string) => void consumidos.push(id) },
      emails: {
        findIdByEmail: async (email: string) => ocupados[email] ?? null,
        updateEmail: async (userId: string, email: string) => void cambios.push({ userId, email }),
      },
    }
  }

  it('con el código cambia el correo (en minúscula y sin espacios) y gasta el código', async () => {
    const d = deps('123456')
    const r = await changeEmail({ ...d, minter, clock: () => NOW })({ userId: 'u1', email: '  Nuevo@Ejemplo.BO ', code: '123456' })
    expect(isOk(r)).toBe(true)
    expect(d.cambios).toEqual([{ userId: 'u1', email: 'nuevo@ejemplo.bo' }])
    expect(d.consumidos).toEqual(['r1'])
  })

  it('un correo sin forma de correo no se guarda ni gasta el código', async () => {
    const d = deps('123456')
    const r = await changeEmail({ ...d, minter, clock: () => NOW })({ userId: 'u1', email: 'nuevo', code: '123456' })
    expect(isErr(r) && r.error.kind).toBe('invalid_email')
    expect(d.cambios).toEqual([])
    expect(d.consumidos).toEqual([])
  })

  it('el correo de otra cuenta no se toma', async () => {
    const d = deps('123456', { 'otra@ejemplo.bo': 'u2' })
    const r = await changeEmail({ ...d, minter, clock: () => NOW })({ userId: 'u1', email: 'otra@ejemplo.bo', code: '123456' })
    expect(isErr(r) && r.error.kind).toBe('email_taken')
    expect(d.cambios).toEqual([])
  })

  it('con el código equivocado no cambia nada y cuenta el intento', async () => {
    const d = deps('123456')
    const r = await changeEmail({ ...d, minter, clock: () => NOW })({ userId: 'u1', email: 'nuevo@ejemplo.bo', code: '000000' })
    expect(isErr(r) && r.error.kind).toBe('invalid_credentials')
    expect(d.cambios).toEqual([])
    expect(d.intentos).toEqual(['r1'])
  })
})

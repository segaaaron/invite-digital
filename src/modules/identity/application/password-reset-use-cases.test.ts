import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { changeEmail, confirmPasswordReset, requestAccountCode, requestEmailChange, requestPasswordReset } from './password-reset-use-cases'
import type { PasswordHasher, PasswordResetRepository, SessionRepository, TokenMinter, UserRepository } from './ports'

const NOW = new Date('2026-10-20T15:00:00Z')
const minter: TokenMinter = { mint: () => ({ token: 't', hash: Buffer.alloc(0) }), hashOf: (t) => Buffer.from(`h:${t}`) }

function dobles({ emite = 'emitido' as 'emitido' | 'demasiados', codigo = '123456' as string | null, pendingEmail = null as string | null, sinIntentosHasta = null as Date | null } = {}) {
  const emitidos: { userId: string; codeHash: Buffer; pendingEmail: string | null }[] = []
  const consumidos: string[] = []
  const contrasenas: string[] = []
  const cerradas: string[] = []

  const resets: PasswordResetRepository = {
    issue: async ({ userId, codeHash, pendingEmail: para = null }) => {
      if (emite === 'emitido') emitidos.push({ userId, codeHash, pendingEmail: para })
      return emite
    },
    cobrarIntento: async () => {
      if (sinIntentosHasta !== null) return { estado: 'sin_intentos', hasta: sinIntentosHasta }
      return codigo === null ? { estado: 'sin_codigo' } : { estado: 'cobrado', id: 'r1', codeHash: Buffer.from(`h:${codigo}`), pendingEmail }
    },
    consume: async (id) => void consumidos.push(id),
    deleteExpired: async () => 0,
  }
  const users = {
    findIdByEmail: async (email: string) => (email === 'ana@ejemplo.bo' ? 'u1' : null),
    updatePassword: async (_u: string, hash: string) => void contrasenas.push(hash),
  } as unknown as UserRepository
  const sessions = { deleteByUser: async (userId: string) => void cerradas.push(userId) } as unknown as SessionRepository
  const hasher = { hash: async (clara: string) => `hash:${clara}`, verify: async () => true } as unknown as PasswordHasher

  return { resets, users, sessions, hasher, emitidos, consumidos, contrasenas, cerradas }
}

describe('requestPasswordReset', () => {
  it('con cuenta devuelve el código una vez, y a la base va su hash, no el código', async () => {
    const d = dobles()
    const r = await requestPasswordReset({ users: d.users, resets: d.resets, minter, clock: () => NOW })('  Ana@Ejemplo.BO ')

    expect(isOk(r) && r.value?.userId).toBe('u1')
    expect(isOk(r) && r.value?.code).toMatch(/^\d{6}$/)
    expect(d.emitidos).toHaveLength(1)
    // Lo guardado pasa por el acuñador: en la base nunca hay un código legible.
    expect(d.emitidos[0]!.codeHash).toEqual(minter.hashOf(isOk(r) && r.value ? r.value.code : ''))
  })

  it('un correo sin cuenta responde igual: esta pantalla no puede decir quién es cliente', async () => {
    const d = dobles()
    const r = await requestPasswordReset({ users: d.users, resets: d.resets, minter, clock: () => NOW })('otra@ejemplo.bo')

    expect(isOk(r) && r.value).toBeNull()
    expect(d.emitidos).toHaveLength(0)
  })

  // F2 del escaneo: pedir códigos sin fin era media toma de cuenta. Y decir «demasiados» aquí
  // confirmaría que la cuenta existe, así que se responde como un correo sin cuenta.
  it('con el cupo de la cuenta agotado no emite nada y responde como si no hubiera cuenta', async () => {
    const d = dobles({ emite: 'demasiados' })
    const r = await requestPasswordReset({ users: d.users, resets: d.resets, minter, clock: () => NOW })('ana@ejemplo.bo')

    expect(isOk(r) && r.value).toBeNull()
    expect(d.emitidos).toHaveLength(0)
  })
})

describe('confirmPasswordReset', () => {
  const deps = (d: ReturnType<typeof dobles>) => ({ users: d.users, resets: d.resets, sessions: d.sessions, hasher: d.hasher, minter, clock: () => NOW })

  it('con el código bueno escribe la contraseña, gasta el código y cierra las sesiones', async () => {
    const d = dobles({ codigo: '123456' })
    const r = await confirmPasswordReset(deps(d))({ email: 'ana@ejemplo.bo', code: '123 456', password: 'contrasena-larga-1' })

    expect(isOk(r)).toBe(true)
    expect(d.consumidos).toEqual(['r1'])
    expect(d.contrasenas).toEqual(['hash:contrasena-larga-1'])
    expect(d.cerradas).toEqual(['u1'])
  })

  it('con el código malo no toca nada', async () => {
    const d = dobles({ codigo: '999999' })
    const r = await confirmPasswordReset(deps(d))({ email: 'ana@ejemplo.bo', code: '123456', password: 'contrasena-larga-1' })

    expect(isErr(r)).toBe(true)
    expect(d.consumidos).toEqual([])
    expect(d.contrasenas).toEqual([])
  })

  // El código caducado y el gastado son el mismo `sin_codigo`: la pantalla no dice en cuál está.
  it('sin código vivo, rechaza sin escribir contraseña', async () => {
    const d = dobles({ codigo: null })
    const r = await confirmPasswordReset(deps(d))({ email: 'ana@ejemplo.bo', code: '123456', password: 'contrasena-larga-1' })

    expect(isErr(r)).toBe(true)
    expect(d.contrasenas).toEqual([])
  })

  /**
   * El cupo de fallos de la cuenta **sí** se distingue, y es lo que arregla el callejón sin salida:
   * los quince fallos de la hora sobreviven a emitir un código nuevo, así que mientras todo volvía
   * como `invalid_credentials` las tres pantallas aconsejaban «pide uno nuevo» —lo único que no
   * sirve— y la cuenta se quedaba hasta una hora sin recuperar contraseña, cerrar sesiones ni
   * cambiar el correo. Cualquiera que supiera el correo podía dejarla así.
   */
  it('con el cupo de fallos de la cuenta agotado lo dice como tal, no como código inválido', async () => {
    const d = dobles({ sinIntentosHasta: new Date(NOW.getTime() + 20 * 60_000) })
    const r = await confirmPasswordReset(deps(d))({ email: 'ana@ejemplo.bo', code: '123456', password: 'contrasena-larga-1' })

    expect(isErr(r) && r.error.kind).toBe('too_many_attempts')
    expect(isErr(r) && r.error.detail).toContain('20 min')
    expect(d.contrasenas).toEqual([])
  })

  it('una contraseña corta se rechaza y el código no se gasta', async () => {
    const d = dobles({ codigo: '123456' })
    const r = await confirmPasswordReset(deps(d))({ email: 'ana@ejemplo.bo', code: '123456', password: 'corta' })

    expect(isErr(r) && r.error.kind).toBe('weak_password')
    expect(d.consumidos).toEqual([])
  })
})

describe('requestAccountCode', () => {
  it('con sesión sí se dice la verdad del cupo: no hay nada que filtrar', async () => {
    const d = dobles({ emite: 'demasiados' })
    const r = await requestAccountCode({ users: d.users, resets: d.resets, minter, clock: () => NOW })('u1')

    expect(isErr(r) && r.error.kind).toBe('too_many_attempts')
  })
})

/**
 * El cambio de correo (F12 del escaneo): el código se emite **para** la dirección nueva y solo
 * sirve para ella. Lo que esto cierra es que una cuenta se pusiera el correo de alguien que estaba
 * por comprar y heredara su acceso al evento cuando el admin lo diera de alta por ese correo.
 */
describe('cambio de correo en dos pasos', () => {
  const emails = (ocupados: Record<string, string> = {}) => {
    const cambios: { userId: string; email: string }[] = []
    return {
      cambios,
      puerto: {
        findIdByEmail: async (email: string) => ocupados[email] ?? null,
        updateEmail: async (userId: string, email: string) => void cambios.push({ userId, email }),
      },
    }
  }

  it('el paso 1 emite el código para esa dirección y la devuelve normalizada', async () => {
    const d = dobles()
    const e = emails()
    const r = await requestEmailChange({ resets: d.resets, minter, clock: () => NOW, emails: e.puerto })({ userId: 'u1', email: '  Nuevo@Ejemplo.BO ' })

    expect(isOk(r) && r.value.email).toBe('nuevo@ejemplo.bo')
    expect(d.emitidos[0]!.pendingEmail).toBe('nuevo@ejemplo.bo')
  })

  it('no emite nada para un correo que ya es de otra cuenta', async () => {
    const d = dobles()
    const e = emails({ 'ocupado@ejemplo.bo': 'u2' })
    const r = await requestEmailChange({ resets: d.resets, minter, clock: () => NOW, emails: e.puerto })({ userId: 'u1', email: 'ocupado@ejemplo.bo' })

    expect(isErr(r) && r.error.kind).toBe('email_taken')
    expect(d.emitidos).toHaveLength(0)
  })

  it('el paso 2 cambia el correo con el código emitido para esa dirección', async () => {
    const d = dobles({ codigo: '123456', pendingEmail: 'nuevo@ejemplo.bo' })
    const e = emails()
    const r = await changeEmail({ resets: d.resets, minter, clock: () => NOW, emails: e.puerto })({ userId: 'u1', email: 'nuevo@ejemplo.bo', code: '123 456' })

    expect(isOk(r) && r.value).toBe('nuevo@ejemplo.bo')
    expect(e.cambios).toEqual([{ userId: 'u1', email: 'nuevo@ejemplo.bo' }])
  })

  it('un código del correo actual no cambia la dirección: es el agujero que cerró la 0098', async () => {
    const d = dobles({ codigo: '123456', pendingEmail: null })
    const e = emails()
    const r = await changeEmail({ resets: d.resets, minter, clock: () => NOW, emails: e.puerto })({ userId: 'u1', email: 'nuevo@ejemplo.bo', code: '123456' })

    expect(isErr(r) && r.error.kind).toBe('invalid_credentials')
    expect(e.cambios).toEqual([])
  })

  it('y el código de una dirección no sirve para cambiarse a otra', async () => {
    const d = dobles({ codigo: '123456', pendingEmail: 'nuevo@ejemplo.bo' })
    const e = emails()
    const r = await changeEmail({ resets: d.resets, minter, clock: () => NOW, emails: e.puerto })({ userId: 'u1', email: 'otra@ejemplo.bo', code: '123456' })

    expect(isErr(r) && r.error.kind).toBe('invalid_credentials')
    expect(e.cambios).toEqual([])
  })

  it('al revés también: el código de un cambio de correo no cambia la contraseña', async () => {
    const d = dobles({ codigo: '123456', pendingEmail: 'nuevo@ejemplo.bo' })
    const r = await confirmPasswordReset({ users: d.users, resets: d.resets, sessions: d.sessions, hasher: d.hasher, minter, clock: () => NOW })({
      email: 'ana@ejemplo.bo',
      code: '123456',
      password: 'contrasena-larga-1',
    })

    expect(isErr(r)).toBe(true)
    expect(d.contrasenas).toEqual([])
  })
})

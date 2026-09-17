import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { changePassword } from './change-password'
import type { PasswordHasher, SessionRepository, UserRepository } from './ports'

const HASH_ACTUAL = 'hash-de-la-actual'

/** Doble que recuerda lo que se le escribió: es lo único que hay que comprobar. */
function dobles(existe = true) {
  const escrito: { userId: string; passwordHash: string }[] = []
  const cerradas: string[] = []

  const users: UserRepository = {
    findByEmail: async (email) => (existe ? { id: 'u1', email, passwordHash: HASH_ACTUAL } : null),
    findActor: async () => ({ id: 'u1', email: 'novios@ejemplo.bo', role: 'cliente', mustChangePassword: false }),
    create: async () => ({ id: 'u1' }),
    updatePassword: async (userId, passwordHash) => {
      escrito.push({ userId, passwordHash })
    },
    findIdByEmail: async () => (existe ? 'u1' : null),
    completarContacto: async () => {},
  }

  const sessions: SessionRepository = {
    create: async () => {},
    findByTokenHash: async () => null,
    touch: async () => {},
    deleteByTokenHash: async () => {},
    deleteExpired: async () => 0,
    deleteByUser: async (userId) => {
      cerradas.push(userId)
    },
    setDevice: async () => {},
    seen: async () => {},
    listByUser: async () => [],
    deleteOthers: async () => {},
  }

  // Solo acierta quien presenta la contraseña actual de verdad.
  const hasher: PasswordHasher = {
    hash: async (password) => `hash-de-${password}`,
    verify: async (password, hash) => hash === HASH_ACTUAL && password === 'la-de-siempre-12',
  }

  return { users, sessions, hasher, escrito, cerradas }
}

const ACTOR = { userId: 'u1', email: 'novios@ejemplo.bo' }

describe('changePassword', () => {
  it('guarda el hash de la nueva', async () => {
    const d = dobles()

    const salida = await changePassword(d)({ ...ACTOR, current: 'la-de-siempre-12', next: 'una-nueva-larga-1' })

    expect(isOk(salida)).toBe(true)
    expect(d.escrito).toEqual([{ userId: 'u1', passwordHash: 'hash-de-una-nueva-larga-1' }])
  })

  it('cierra todas las sesiones, también la de quien la cambia', async () => {
    // Si la contraseña se cambió porque se filtró, dejar viva la sesión del intruso deja
    // la puerta abierta justo después de cerrarla con llave.
    const d = dobles()

    await changePassword(d)({ ...ACTOR, current: 'la-de-siempre-12', next: 'una-nueva-larga-1' })

    expect(d.cerradas).toEqual(['u1'])
  })

  it('con la contraseña actual equivocada no escribe nada', async () => {
    const d = dobles()

    const salida = await changePassword(d)({ ...ACTOR, current: 'me-la-invento-12', next: 'una-nueva-larga-1' })

    expect(isErr(salida) && salida.error.kind).toBe('invalid_credentials')
    expect(d.escrito).toEqual([])
    expect(d.cerradas).toEqual([])
  })

  it('una contraseña nueva corta se rechaza, y la vieja sigue valiendo', async () => {
    const d = dobles()

    const salida = await changePassword(d)({ ...ACTOR, current: 'la-de-siempre-12', next: 'corta' })

    expect(isErr(salida) && salida.error.kind).toBe('weak_password')
    expect(d.escrito).toEqual([])
  })

  it('un usuario que ya no existe no cambia nada', async () => {
    // La sesión sigue viva y al usuario lo borró el admin mientras miraba la pantalla.
    const d = dobles(false)

    const salida = await changePassword(d)({ ...ACTOR, current: 'la-de-siempre-12', next: 'una-nueva-larga-1' })

    expect(isErr(salida) && salida.error.kind).toBe('invalid_credentials')
    expect(d.escrito).toEqual([])
  })
})

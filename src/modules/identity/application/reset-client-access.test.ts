import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { resetClientAccess } from './reset-client-access'

function dobles(role: string | null) {
  const escrito: { userId: string; hash: string }[] = []
  const cerradas: string[] = []
  const reset = resetClientAccess({
    findActor: async (id) => (role === null ? null : { id, email: 'novios@ejemplo.bo', role, mustChangePassword: false }),
    setProvisionalPassword: async (userId, hash) => void escrito.push({ userId, hash }),
    closeSessions: async (userId) => void cerradas.push(userId),
    hash: async (clave) => `hash:${clave}`,
    generate: () => 'provisional-123456',
  })
  return { reset, escrito, cerradas }
}

describe('resetClientAccess', () => {
  it('a un cliente le pone una provisional que debe cambiar y le cierra todas las sesiones', async () => {
    const { reset, escrito, cerradas } = dobles('cliente')
    const r = await reset('c1')
    expect(isOk(r) && r.value).toEqual({ email: 'novios@ejemplo.bo', password: 'provisional-123456' })
    expect(escrito).toEqual([{ userId: 'c1', hash: 'hash:provisional-123456' }])
    expect(cerradas).toEqual(['c1'])
  })

  it.each(['admin', 'atelier', 'puerta'])('nunca sobre una cuenta %s: restablecer es para clientes', async (role) => {
    const { reset, escrito, cerradas } = dobles(role)
    expect(isErr(await reset('x1'))).toBe(true)
    expect(escrito).toEqual([])
    expect(cerradas).toEqual([])
  })

  it('una cuenta que no existe no escribe nada', async () => {
    const { reset, escrito } = dobles(null)
    expect(isErr(await reset('x1'))).toBe(true)
    expect(escrito).toEqual([])
  })
})

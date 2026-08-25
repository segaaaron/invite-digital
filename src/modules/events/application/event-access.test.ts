import { describe, expect, it } from 'vitest'
import { checkEventPassword, setEventPassword, type AccessRepository, type PasswordHasher } from './event-access'
import type { EventInput } from '../domain/event'
import type { EventRepository } from './ports'
import { isErr, isOk } from '@/shared/result'

const fila: EventInput = {
  id: 'e1',
  userId: null,
  slug: 'boda',
  title: 'Boda',
  eventDate: '2027-05-15',
  rsvpDeadline: '2027-05-01',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
  retentionDays: 90,
  currency: 'BOB', messageTemplate: null, venue: null,
}

const events: EventRepository = {
  listPendingAnonymization: async () => [],
  anonymize: async () => {},
  insert: async () => {},
  update: async () => {},
  listByIds: async () => [],
  listByUser: async () => [],
  setOwner: async () => {},
  listAll: async () => [],
  findBySlug: async () => fila,
  findById: async () => fila,
  remove: async () => {},
}

function acceso(inicial: string | null = null) {
  let guardado = inicial
  const access: AccessRepository = {
    setPasswordHash: async (_id, hash) => {
      guardado = hash
    },
    passwordHashOf: async () => guardado,
  }
  return { access, leer: () => guardado }
}

// Ojo con el orden de los argumentos: es `verify(password, hash)`, como en identidad.
// Invertirlo compila —son dos cadenas— y hace que ninguna contraseña valide nunca.
const hasher: PasswordHasher = {
  hash: async (password) => `hash:${password}`,
  verify: async (password, hash) => hash === `hash:${password}`,
}

describe('setEventPassword', () => {
  it('guarda el hash, nunca la contraseña', async () => {
    // Si alguien lee la base no puede encontrar nada con lo que entrar. Es el mismo
    // criterio que rige para los tokens de invitado y las sesiones del atelier.
    const { access, leer } = acceso()
    await setEventPassword({ events, access, hasher })({ eventId: 'e1', password: 'boda2026' })

    expect(leer()).toBe('hash:boda2026')
    expect(leer()).not.toContain('boda2026'.slice(0, 4) + '"')
  })

  it('rechaza una contraseña demasiado corta', async () => {
    const { access, leer } = acceso()
    const result = await setEventPassword({ events, access, hasher })({ eventId: 'e1', password: 'abc' })

    expect(isErr(result)).toBe(true)
    expect(leer()).toBeNull()
  })

  it('pasar null vuelve el evento público', async () => {
    const { access, leer } = acceso('hash:algo')
    const result = await setEventPassword({ events, access, hasher })({ eventId: 'e1', password: null })

    expect(isOk(result)).toBe(true)
    expect(leer()).toBeNull()
  })
})

describe('checkEventPassword', () => {
  it('un evento sin contraseña deja pasar sin preguntar', async () => {
    const { access } = acceso(null)
    const result = await checkEventPassword({ access, hasher })({ eventId: 'e1', password: '' })
    expect(isOk(result) && result.value).toBe(true)
  })

  it('acepta la buena y rechaza la mala', async () => {
    const { access } = acceso('hash:boda2026')
    const buena = await checkEventPassword({ access, hasher })({ eventId: 'e1', password: 'boda2026' })
    const mala = await checkEventPassword({ access, hasher })({ eventId: 'e1', password: 'otra' })

    expect(isOk(buena) && buena.value).toBe(true)
    expect(isOk(mala) && mala.value).toBe(false)
  })
})

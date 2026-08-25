import { describe, expect, it } from 'vitest'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import {
  checkEventPassword,
  setEventPassword,
  type AccessRepository,
} from '../application/event-access'
import type { EventInput } from '../domain/event'
import type { EventRepository } from '../application/ports'
import { isOk } from '@/shared/result'

// Vive en `infrastructure` y no junto al resto de pruebas del caso de uso porque usa el
// hasher de verdad, y `application` no puede importar `infrastructure`: la frontera lo
// impide, y con razón.

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
  listByUser: async () => [],
  setOwner: async () => {},
  listAll: async () => [],
  findBySlug: async () => fila,
  findById: async () => fila,
  remove: async () => {},
}

function acceso() {
  let guardado: string | null = null
  const access: AccessRepository = {
    setPasswordHash: async (_id, hash) => {
      guardado = hash
    },
    passwordHashOf: async () => guardado,
  }
  return { access }
}

describe('la contraseña del evento contra argon2 de verdad', () => {
  it('lo que guarda setEventPassword es lo que acepta checkEventPassword', async () => {
    // Esta prueba existe porque los dobles pueden repetir el error del código: si el
    // orden de los argumentos de `verify` se invierte, todo compila —son dos cadenas—,
    // los dobles siguen pasando y NINGUNA contraseña valida jamás, sin un solo error en
    // el registro. Pasó. Con el hasher real se cae aquí.
    const { access } = acceso()

    await setEventPassword({ events, access, hasher: argon2Hasher })({ eventId: 'e1', password: 'lasflores2027' })

    const buena = await checkEventPassword({ access, hasher: argon2Hasher })({
      eventId: 'e1',
      password: 'lasflores2027',
    })
    const mala = await checkEventPassword({ access, hasher: argon2Hasher })({ eventId: 'e1', password: 'otra' })

    expect(isOk(buena) && buena.value).toBe(true)
    expect(isOk(mala) && mala.value).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { addPerson, updatePerson } from './person-use-cases'
import type { GuestPerson } from '../domain/person'
import type { GuestGroupRepository, GuestPersonRepository } from './ports'
import { isErr, isOk } from '@/shared/result'

const grupo = (seats: number): GuestGroupRepository => ({
  insert: async () => {},
  listByEvent: async () => [],
  findByTokenHash: async () => null,
  revoke: async () => {},
  markOpened: async () => {},
  remove: async () => {},
  markSent: async () => {},
  replaceToken: async () => {},
  reopenRsvp: async () => {},
  setPhone: async () => {},
  findById: async () => ({
    id: 'g1',
    eventId: 'e1',
    label: 'Familia Rojas Peña',
    seats,
    revokedAt: null,
    openedAt: null,
  }),
})

function personas(iniciales: GuestPerson[] = []) {
  const filas = [...iniciales]
  const repo: GuestPersonRepository = {
    insert: async (p) => {
      filas.push(p)
    },
    update: async (p) => {
      const i = filas.findIndex((f) => f.id === p.id)
      filas[i] = p
    },
    remove: async (id) => {
      const i = filas.findIndex((f) => f.id === id)
      filas.splice(i, 1)
    },
    listByGroup: async () => filas,
    listByEvent: async () => filas,
    countInGroup: async () => filas.length,
    findById: async (id) => filas.find((f) => f.id === id) ?? null,
  }
  return { repo, filas }
}

describe('addPerson', () => {
  it('carga a la persona cuando cabe en el cupo', async () => {
    const { repo, filas } = personas()
    const alta = addPerson({ groups: grupo(2), people: repo, ids: () => 'p1' })

    const result = await alta({ guestGroupId: 'g1', fullName: 'Ana Vega', dietaryNote: 'Sin gluten' })

    expect(isOk(result)).toBe(true)
    expect(filas).toHaveLength(1)
    expect(filas[0]?.dietaryNote).toBe('Sin gluten')
  })

  it('rechaza cargar más personas que cupos, en el servidor', async () => {
    // El cupo es lo que se le prometió al invitado y lo que la puerta cuenta al escanear.
    // Dejar que el panel cargue cinco en un grupo de cuatro deja a alguien fuera el día
    // del evento, delante de la puerta.
    const { repo } = personas([
      { id: 'a', guestGroupId: 'g1', fullName: 'Ana', isCompanion: false, dietaryNote: null, vip: false, attending: null, email: null },
    ])
    const alta = addPerson({ groups: grupo(1), people: repo, ids: () => 'p2' })

    const result = await alta({ guestGroupId: 'g1', fullName: 'Luis' })

    expect(isErr(result) && result.error.kind).toBe('invalid_seats')
  })

  it('un grupo que no existe es not_found, no un error de base', async () => {
    const { repo } = personas()
    const sinGrupo: GuestGroupRepository = { ...grupo(4), findById: async () => null }
    const result = await addPerson({ groups: sinGrupo, people: repo, ids: () => 'p1' })({
      guestGroupId: 'fantasma',
      fullName: 'Ana',
    })
    expect(isErr(result) && result.error.kind).toBe('not_found')
  })
})

describe('updatePerson', () => {
  it('el parche solo lleva lo que cambia: marcar VIP no borra la restricción', async () => {
    const { repo, filas } = personas([
      {
        id: 'a',
        guestGroupId: 'g1',
        fullName: 'Ana',
        isCompanion: false,
        dietaryNote: 'Sin gluten',
        vip: false,
        attending: 'yes', email: null,
      },
    ])

    const result = await updatePerson({ people: repo, groups: grupo(4) })({ id: 'a', vip: true })

    expect(isOk(result)).toBe(true)
    expect(filas[0]?.vip).toBe(true)
    expect(filas[0]?.dietaryNote).toBe('Sin gluten')
    expect(filas[0]?.attending).toBe('yes')
  })

  it('permite borrar la restricción pasándola en nulo', async () => {
    const { repo, filas } = personas([
      { id: 'a', guestGroupId: 'g1', fullName: 'Ana', isCompanion: false, dietaryNote: 'Sin gluten', vip: false, attending: null, email: null },
    ])

    await updatePerson({ people: repo, groups: grupo(4) })({ id: 'a', dietaryNote: null })

    expect(filas[0]?.dietaryNote).toBeNull()
  })
})

/**
 * Editar es un parche: lo que no viene en la entrada tiene que quedar como estaba.
 *
 * El correo se perdía en silencio —`updatePerson` rehacía la persona sin pasarlo, así que
 * marcar VIP desde la tabla borraba el email de quien lo tuviera—. Es el mismo fallo que
 * ya se coló una vez con `attending`, y por la misma razón: `createPerson` recibe un
 * objeto literal donde el campo que falta es, sencillamente, `undefined`.
 */
describe('updatePerson · lo que no se toca se conserva', () => {
  const conCorreo: GuestPerson = {
    id: 'p1',
    guestGroupId: 'g1',
    fullName: 'Ana Vega',
    isCompanion: false,
    dietaryNote: 'Sin gluten',
    vip: false,
    attending: 'yes',
    email: 'ana@ejemplo.com',
  }

  it('marcar VIP no borra el correo', async () => {
    const { repo, filas } = personas([conCorreo])

    const result = await updatePerson({ people: repo, groups: grupo(4) })({ id: 'p1', vip: true })

    expect(isOk(result)).toBe(true)
    expect(filas[0]?.email).toBe('ana@ejemplo.com')
    expect(filas[0]?.vip).toBe(true)
  })

  it('acepta un correo nuevo', async () => {
    const { repo, filas } = personas([conCorreo])

    await updatePerson({ people: repo, groups: grupo(4) })({ id: 'p1', email: 'nueva@ejemplo.com' })

    expect(filas[0]?.email).toBe('nueva@ejemplo.com')
  })

  it('borra el correo cuando llega nulo, que no es lo mismo que no venir', async () => {
    const { repo, filas } = personas([conCorreo])

    await updatePerson({ people: repo, groups: grupo(4) })({ id: 'p1', email: null })

    expect(filas[0]?.email).toBeNull()
  })
})

/**
 * Mover a alguien de grupo cambia de enlace, de cupo y de mesa: es el grupo quien tiene
 * todo eso. Por eso el cupo del **destino** se comprueba en el servidor, igual que en el
 * alta, y no en el formulario.
 */
describe('updatePerson · mover de grupo', () => {
  const ana: GuestPerson = {
    id: 'p1',
    guestGroupId: 'g1',
    fullName: 'Ana Vega',
    isCompanion: false,
    dietaryNote: null,
    vip: false,
    attending: null,
    email: null,
  }

  const grupos = (seats: number): GuestGroupRepository => ({ ...grupo(seats), findById: async (id) => ({ id, eventId: 'e1', label: 'Destino', seats, revokedAt: null, openedAt: null }) })

  it('cambia el grupo cuando queda sitio', async () => {
    const { repo, filas } = personas([ana])

    const result = await updatePerson({ people: repo, groups: grupos(4) })({ id: 'p1', guestGroupId: 'g2' })

    expect(isOk(result)).toBe(true)
    expect(filas[0]?.guestGroupId).toBe('g2')
  })

  it('rechaza el traslado si el grupo de destino ya está lleno', async () => {
    const { repo, filas } = personas([ana])
    // El repositorio cuenta una persona en el destino y el destino tiene un solo cupo.
    const result = await updatePerson({ people: repo, groups: grupos(1) })({ id: 'p1', guestGroupId: 'g2' })

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_seats')
    expect(filas[0]?.guestGroupId).toBe('g1')
  })

  it('un grupo de destino que no existe es un error, no un traslado a la nada', async () => {
    const { repo } = personas([ana])
    const sinGrupo: GuestGroupRepository = { ...grupo(4), findById: async () => null }

    const result = await updatePerson({ people: repo, groups: sinGrupo })({ id: 'p1', guestGroupId: 'fantasma' })

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('not_found')
  })
})

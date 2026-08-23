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
      { id: 'a', guestGroupId: 'g1', fullName: 'Ana', isCompanion: false, dietaryNote: null, vip: false, attending: null },
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
        attending: 'yes',
      },
    ])

    const result = await updatePerson({ people: repo })({ id: 'a', vip: true })

    expect(isOk(result)).toBe(true)
    expect(filas[0]?.vip).toBe(true)
    expect(filas[0]?.dietaryNote).toBe('Sin gluten')
    expect(filas[0]?.attending).toBe('yes')
  })

  it('permite borrar la restricción pasándola en nulo', async () => {
    const { repo, filas } = personas([
      { id: 'a', guestGroupId: 'g1', fullName: 'Ana', isCompanion: false, dietaryNote: 'Sin gluten', vip: false, attending: null },
    ])

    await updatePerson({ people: repo })({ id: 'a', dietaryNote: null })

    expect(filas[0]?.dietaryNote).toBeNull()
  })
})

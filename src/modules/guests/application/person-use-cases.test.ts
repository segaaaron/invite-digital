import { describe, expect, it } from 'vitest'
import { addPerson, removePerson, updatePerson } from './person-use-cases'
import type { GuestPerson } from '../domain/person'
import type { GuestGroupRepository, GuestGroupRow, GuestPersonRepository } from './ports'
import { isErr, isOk } from '@/shared/result'

/**
 * Una base en memoria con **dos eventos**: `e1` es el del atelier que llama y `e2` el de
 * otra boda. Los dobles filtran por evento igual que la base, así que una prueba que pase
 * `e1` y un identificador de `e2` ve lo mismo que vería en producción: nada.
 */
function base(grupos: GuestGroupRow[], gente: GuestPerson[]) {
  const filasGrupo = grupos.map((g) => ({ ...g }))
  const filas = gente.map((p) => ({ ...p }))
  const deEvento = (eventId: string, id: string) => filasGrupo.find((g) => g.id === id && g.eventId === eventId)
  const eventoDe = (person: { guestGroupId: string }) => filasGrupo.find((g) => g.id === person.guestGroupId)?.eventId

  const groups: GuestGroupRepository = {
    insert: async () => {},
    listByEvent: async (eventId) => filasGrupo.filter((g) => g.eventId === eventId),
    findByTokenHash: async () => null,
    markOpened: async () => {},
    findById: async (eventId, id) => deEvento(eventId, id) ?? null,
    revoke: async () => {},
    markSent: async () => {},
    replaceToken: async () => {},
    reopenRsvp: async () => {},
    setPhone: async () => {},
    setSeats: async (eventId, id, seats) => {
      const g = deEvento(eventId, id)
      if (g) g.seats = seats
    },
    setLabel: async (eventId, id, label) => {
      const g = deEvento(eventId, id)
      if (g) g.label = label
    },
    remove: async (eventId, id) => {
      const i = filasGrupo.findIndex((g) => g.id === id && g.eventId === eventId)
      if (i >= 0) filasGrupo.splice(i, 1)
    },
  }

  const people: GuestPersonRepository = {
    insert: async (p) => void filas.push({ ...p }),
    update: async (eventId, p) => {
      const i = filas.findIndex((f) => f.id === p.id)
      if (i >= 0 && eventoDe(filas[i]!) === eventId) filas[i] = { ...p }
    },
    remove: async (eventId, id) => {
      const i = filas.findIndex((f) => f.id === id)
      if (i >= 0 && eventoDe(filas[i]!) === eventId) filas.splice(i, 1)
    },
    listByGroup: async (groupId) => filas.filter((f) => f.guestGroupId === groupId),
    listByEvent: async (eventId) => filas.filter((f) => eventoDe(f) === eventId),
    countInGroup: async (groupId) => filas.filter((f) => f.guestGroupId === groupId).length,
    findById: async (eventId, id) => filas.find((f) => f.id === id && eventoDe(f) === eventId) ?? null,
  }

  return { groups, people, filas, grupos: filasGrupo }
}

const grupo = (id: string, eventId: string, label: string, seats: number): GuestGroupRow => ({
  id,
  eventId,
  label,
  seats,
  revokedAt: null,
  openedAt: null,
})

const persona = (id: string, guestGroupId: string, fullName: string, over: Partial<GuestPerson> = {}): GuestPerson => ({
  id,
  guestGroupId,
  fullName,
  isCompanion: false,
  dietaryNote: null,
  vip: false,
  attending: null,
  email: null,
  ...over,
})

describe('addPerson', () => {
  it('carga a la persona en su invitación', async () => {
    const b = base([grupo('g1', 'e1', 'Ana Vega', 2)], [])
    const result = await addPerson({ ...b, ids: () => 'p1' })({ eventId: 'e1', guestGroupId: 'g1', fullName: 'Ana Vega', dietaryNote: 'Sin gluten' })

    expect(isOk(result)).toBe(true)
    expect(b.filas[0]?.dietaryNote).toBe('Sin gluten')
  })

  it('con el cupo lleno, el cupo crece: nadie se queda fuera y el atelier no choca con un tope que no puede cambiar', async () => {
    const b = base([grupo('g1', 'e1', 'Ana Vega', 1)], [persona('a', 'g1', 'Ana Vega')])
    const result = await addPerson({ ...b, ids: () => 'p2' })({ eventId: 'e1', guestGroupId: 'g1', fullName: 'Luis', isCompanion: true })

    expect(isOk(result)).toBe(true)
    expect(b.grupos[0]?.seats).toBe(2)
  })

  it('una invitación de otro evento es not_found y no carga a nadie', async () => {
    const b = base([grupo('g2', 'e2', 'Ajenos', 4)], [])
    const result = await addPerson({ ...b, ids: () => 'p1' })({ eventId: 'e1', guestGroupId: 'g2', fullName: 'Intruso' })

    expect(isErr(result) && result.error.kind).toBe('not_found')
    expect(b.filas).toHaveLength(0)
  })
})

describe('updatePerson', () => {
  it('el parche solo lleva lo que cambia: marcar VIP no borra restricción, asistencia ni correo', async () => {
    const b = base([grupo('g1', 'e1', 'Ana', 1)], [persona('a', 'g1', 'Ana', { dietaryNote: 'Sin gluten', attending: 'yes', email: 'ana@ejemplo.com' })])

    const result = await updatePerson(b)({ eventId: 'e1', id: 'a', vip: true })

    expect(isOk(result)).toBe(true)
    expect(b.filas[0]).toMatchObject({ vip: true, dietaryNote: 'Sin gluten', attending: 'yes', email: 'ana@ejemplo.com' })
  })

  it('nulo borra el dato, que no es lo mismo que no venir', async () => {
    const b = base([grupo('g1', 'e1', 'Ana', 1)], [persona('a', 'g1', 'Ana', { dietaryNote: 'Sin gluten', email: 'ana@ejemplo.com' })])

    await updatePerson(b)({ eventId: 'e1', id: 'a', dietaryNote: null, email: null })

    expect(b.filas[0]).toMatchObject({ dietaryNote: null, email: null })
  })

  it('renombrar al principal renombra su invitación, salvo que tenga nombre propio', async () => {
    const b = base(
      [grupo('g1', 'e1', 'Ana', 1), grupo('g2', 'e1', 'Familia Rojas', 2)],
      [persona('a', 'g1', 'Ana'), persona('r', 'g2', 'Rosa Rojas'), persona('c', 'g2', 'Carlos', { isCompanion: true })],
    )

    await updatePerson(b)({ eventId: 'e1', id: 'a', fullName: 'Ana Vega' })
    await updatePerson(b)({ eventId: 'e1', id: 'r', fullName: 'Rosa Rojas Peña' })
    await updatePerson(b)({ eventId: 'e1', id: 'c', fullName: 'Familia Rojas' })

    expect(b.grupos.map((g) => g.label)).toEqual(['Ana Vega', 'Familia Rojas'])
  })

  it('una persona de otro evento es not_found y no se toca', async () => {
    const b = base([grupo('g2', 'e2', 'Ajenos', 1)], [persona('x', 'g2', 'Ajena')])

    const result = await updatePerson(b)({ eventId: 'e1', id: 'x', fullName: 'Cambiada' })

    expect(isErr(result) && result.error.kind).toBe('not_found')
    expect(b.filas[0]?.fullName).toBe('Ajena')
  })

  it('no se mueve a nadie a una invitación de otro evento', async () => {
    const b = base([grupo('g1', 'e1', 'Ana', 1), grupo('g2', 'e2', 'Ajenos', 4)], [persona('a', 'g1', 'Ana')])

    const result = await updatePerson(b)({ eventId: 'e1', id: 'a', guestGroupId: 'g2' })

    expect(isErr(result) && result.error.kind).toBe('not_found')
    expect(b.filas[0]?.guestGroupId).toBe('g1')
  })

  it('mover a una invitación llena le sube el cupo y entra como acompañante', async () => {
    const b = base(
      [grupo('g1', 'e1', 'Luis', 1), grupo('g2', 'e1', 'Ana', 1)],
      [persona('l', 'g1', 'Luis'), persona('a', 'g2', 'Ana'), persona('l2', 'g1', 'Pedro', { isCompanion: true })],
    )

    const result = await updatePerson(b)({ eventId: 'e1', id: 'l', guestGroupId: 'g2' })

    expect(isOk(result)).toBe(true)
    expect(b.filas.find((f) => f.id === 'l')).toMatchObject({ guestGroupId: 'g2', isCompanion: true })
    expect(b.grupos.find((g) => g.id === 'g2')?.seats).toBe(2)
  })

  it('mover a la última persona de su invitación se lleva la invitación vacía', async () => {
    const b = base([grupo('g1', 'e1', 'Luis', 1), grupo('g2', 'e1', 'Ana', 1)], [persona('l', 'g1', 'Luis'), persona('a', 'g2', 'Ana')])

    await updatePerson(b)({ eventId: 'e1', id: 'l', guestGroupId: 'g2' })

    expect(b.grupos.map((g) => g.id)).toEqual(['g2'])
  })

  it('mover al principal deja al siguiente como principal, y la invitación con su nombre', async () => {
    const b = base(
      [grupo('g1', 'e1', 'Luis', 2), grupo('g2', 'e1', 'Ana', 1)],
      [persona('l', 'g1', 'Luis'), persona('p', 'g1', 'Pedro', { isCompanion: true }), persona('a', 'g2', 'Ana')],
    )

    await updatePerson(b)({ eventId: 'e1', id: 'l', guestGroupId: 'g2' })

    expect(b.filas.find((f) => f.id === 'p')?.isCompanion).toBe(false)
    expect(b.grupos.find((g) => g.id === 'g1')?.label).toBe('Pedro')
  })
})

describe('removePerson', () => {
  it('borrar a la última persona borra también su invitación: no quedan enlaces vacíos', async () => {
    const b = base([grupo('g1', 'e1', 'Yasmin', 1)], [persona('y', 'g1', 'Yasmin')])

    const result = await removePerson(b)({ eventId: 'e1', id: 'y' })

    expect(isOk(result)).toBe(true)
    expect(b.filas).toHaveLength(0)
    expect(b.grupos).toHaveLength(0)
  })

  it('borrar a un acompañante deja la invitación como estaba', async () => {
    const b = base([grupo('g1', 'e1', 'Ana', 2)], [persona('a', 'g1', 'Ana'), persona('l', 'g1', 'Luis', { isCompanion: true })])

    await removePerson(b)({ eventId: 'e1', id: 'l' })

    expect(b.grupos[0]?.label).toBe('Ana')
    expect(b.filas.map((f) => f.id)).toEqual(['a'])
  })

  it('borrar al principal pasa la invitación al siguiente, con su nombre', async () => {
    const b = base([grupo('g1', 'e1', 'Ana', 2)], [persona('a', 'g1', 'Ana'), persona('l', 'g1', 'Luis', { isCompanion: true })])

    await removePerson(b)({ eventId: 'e1', id: 'a' })

    expect(b.filas[0]).toMatchObject({ id: 'l', isCompanion: false })
    expect(b.grupos[0]?.label).toBe('Luis')
  })

  it('una invitación con nombre propio («Familia Rojas») lo conserva al cambiar de principal', async () => {
    const b = base([grupo('g1', 'e1', 'Familia Rojas', 2)], [persona('a', 'g1', 'Ana'), persona('l', 'g1', 'Luis', { isCompanion: true })])

    await removePerson(b)({ eventId: 'e1', id: 'a' })

    expect(b.grupos[0]?.label).toBe('Familia Rojas')
  })

  it('una persona de otro evento es not_found y no se borra nada', async () => {
    const b = base([grupo('g2', 'e2', 'Ajena', 1)], [persona('x', 'g2', 'Ajena')])

    const result = await removePerson(b)({ eventId: 'e1', id: 'x' })

    expect(isErr(result) && result.error.kind).toBe('not_found')
    expect(b.filas).toHaveLength(1)
    expect(b.grupos).toHaveLength(1)
  })
})

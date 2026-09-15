import { describe, expect, it } from 'vitest'
import { deleteEvent } from './delete-event'
import type { EventInput } from '../domain/event'
import type { EventRepository } from './ports'
import { isErr, isOk } from '@/shared/result'

const fila: EventInput = {
  id: 'e1',
  userId: null,
  slug: 'boda-marcia-ricardo',
  title: 'Marcia & Ricardo',
  eventDate: '2027-05-15',
  rsvpDeadline: '2027-05-01',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
  retentionDays: 90,
  currency: 'BOB', messageTemplate: null, venue: null,
}

function repo() {
  const borrados: string[] = []
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
    remove: async (id) => void borrados.push(id),
  }
  return { events, borrados }
}

describe('deleteEvent', () => {
  it('borra cuando el identificador escrito coincide', async () => {
    const { events, borrados } = repo()
    const result = await deleteEvent({ events, purgeFiles: async () => 0 })({ eventId: 'e1', confirmation: 'boda-marcia-ricardo' })

    expect(isOk(result)).toBe(true)
    expect(borrados).toEqual(['e1'])
  })

  it('no borra si el identificador no coincide, y lo comprueba el servidor', async () => {
    // La acción es un extremo HTTP público: un `fetch` a mano se salta cualquier diálogo
    // de confirmación del navegador. Aquí es donde tiene que cortarse.
    const { events, borrados } = repo()
    const result = await deleteEvent({ events, purgeFiles: async () => 0 })({ eventId: 'e1', confirmation: 'boda' })

    expect(isErr(result) && result.error.kind).toBe('invalid_slug')
    expect(borrados).toEqual([])
  })

  it('un evento inexistente es not_found', async () => {
    const { events } = repo()
    const vacio: EventRepository = { ...events, findById: async () => null }
    const result = await deleteEvent({ events: vacio, purgeFiles: async () => 0 })({ eventId: 'fantasma', confirmation: 'x' })
    expect(isErr(result) && result.error.kind).toBe('not_found')
  })

  // Fotografías, canción y documentos privados viven en disco: la cascada de la base se lleva
  // las filas y dejaría los ficheros —contratos incluidos— para siempre.
  it('borra también los ficheros del evento, y solo tras confirmar', async () => {
    const { events } = repo()
    const purgados: string[] = []
    const purgeFiles = async (id: string) => {
      purgados.push(id)
      return 3
    }
    await deleteEvent({ events, purgeFiles })({ eventId: 'e1', confirmation: 'boda' })
    expect(purgados).toEqual([])
    await deleteEvent({ events, purgeFiles })({ eventId: 'e1', confirmation: 'boda-marcia-ricardo' })
    expect(purgados).toEqual(['e1'])
  })
})


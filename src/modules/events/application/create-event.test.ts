import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { EventInput } from '../domain/event'
import { createEventUseCase } from './create-event'
import type { EventRepository } from './ports'

const fila = (slug: string): EventInput => ({
  id: 'existente',
  slug,
  title: 'Ya existe',
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es',
  themeKey: 'clasico',
  status: 'draft',
  retentionDays: 90,
})

const repo = (existing: string[] = []) => {
  const inserted: unknown[] = []
  const events: EventRepository = {
    insert: async (event) => void inserted.push(event),
    update: async () => {},
    listAll: async () => [],
    findBySlug: async (slug) => (existing.includes(slug) ? fila(slug) : null),
    findById: async () => null,
  }
  return { events, inserted }
}

const input = {
  slug: 'boda-ana-y-luis',
  title: 'Boda de Ana y Luis',
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es',
  themeKey: 'clasico',
  status: 'draft',
  retentionDays: 90,
}

describe('createEventUseCase', () => {
  it('inserta el evento con el id que genera', async () => {
    const { events, inserted } = repo()
    const result = await createEventUseCase({ events, ids: () => 'id-fijo' })(input)
    expect(isOk(result) && result.value.id).toBe('id-fijo')
    expect(inserted).toHaveLength(1)
  })

  it('rechaza un slug ya usado sin insertar nada', async () => {
    const { events, inserted } = repo(['boda-ana-y-luis'])
    const result = await createEventUseCase({ events, ids: () => 'id-fijo' })(input)
    expect(isErr(result) && result.error.kind).toBe('duplicate_slug')
    expect(inserted).toHaveLength(0)
  })

  it('no inserta cuando el dominio rechaza la entrada', async () => {
    const { events, inserted } = repo()
    const result = await createEventUseCase({ events, ids: () => 'id-fijo' })({ ...input, rsvpDeadline: '2027-01-01' })
    expect(isErr(result)).toBe(true)
    expect(inserted).toHaveLength(0)
  })

  it('convierte una caída de la base en storage_failure', async () => {
    const events: EventRepository = {
      insert: async () => {
        throw new Error('conexión rechazada')
      },
      update: async () => {},
      listAll: async () => [],
      findBySlug: async () => null,
      findById: async () => null,
    }
    const result = await createEventUseCase({ events, ids: () => 'id-fijo' })(input)
    expect(isErr(result) && result.error.kind).toBe('storage_failure')
  })
})

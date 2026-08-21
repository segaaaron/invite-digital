import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { anonymizeExpiredEvents } from './anonymize-expired-events'
import type { AnonymizationCandidate, EventRepository } from './ports'

const NOW = new Date('2026-08-19T12:00:00Z')

const repo = (pending: AnonymizationCandidate[]) => {
  const anonymized: Array<{ id: string; at: Date }> = []
  const events: EventRepository = {
    listPendingAnonymization: async () => pending,
    anonymize: async (id, at) => void anonymized.push({ id, at }),
    insert: async () => {},
    update: async () => {},
    listAll: async () => [],
    findBySlug: async () => null,
    findById: async () => null,
  }
  return { events, anonymized }
}

describe('anonymizeExpiredEvents', () => {
  it('anonimiza cada evento que el repositorio da por vencido', async () => {
    const { events, anonymized } = repo([
      { id: 'e1', slug: 'boda-vieja', retentionDays: 90, eventDate: '2026-01-01' },
      { id: 'e2', slug: 'xv-vieja', retentionDays: 30, eventDate: '2026-02-01' },
    ])

    const result = await anonymizeExpiredEvents({ events, deleteExpiredSessions: async () => 0, clock: () => NOW })()

    expect(isOk(result) && result.value.eventsAnonymized).toEqual(['boda-vieja', 'xv-vieja'])
    expect(anonymized.map((a) => a.id)).toEqual(['e1', 'e2'])
  })

  it('no toca nada cuando no hay vencidos', async () => {
    const { events, anonymized } = repo([])
    const result = await anonymizeExpiredEvents({ events, deleteExpiredSessions: async () => 0, clock: () => NOW })()

    expect(isOk(result) && result.value.eventsAnonymized).toEqual([])
    expect(anonymized).toHaveLength(0)
  })

  it('barre las sesiones caducadas en el mismo pase', async () => {
    const { events } = repo([])
    const result = await anonymizeExpiredEvents({ events, deleteExpiredSessions: async () => 7, clock: () => NOW })()
    expect(isOk(result) && result.value.sessionsDeleted).toBe(7)
  })

  it('convierte una caída de la base en storage_failure', async () => {
    const { events } = repo([])
    const result = await anonymizeExpiredEvents({
      events,
      deleteExpiredSessions: async () => {
        throw new Error('conexión rechazada')
      },
      clock: () => NOW,
    })()
    expect(isErr(result) && result.error.kind).toBe('storage_failure')
  })
})

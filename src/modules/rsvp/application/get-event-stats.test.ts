import { describe, expect, it, vi } from 'vitest'
import { isErr } from '@/shared/result'
import { getEventStats } from './get-event-stats'
import type { RsvpRepository } from './ports'

const repo = (rows: Array<{ seats: number; attending: number | null }>): RsvpRepository => ({
  append: vi.fn(),
  reopenedAtFor: async () => null,
  latestFor: vi.fn(),
  tallyRowsFor: vi.fn(async () => rows),
    respondedAtsFor: vi.fn(async () => []),
latestByEvent: async () => new Map(),
})

describe('getEventStats', () => {
  it('devuelve el embudo del evento a partir de las filas del repositorio', async () => {
    const result = await getEventStats({
      rsvp: repo([
        { seats: 4, attending: 3 },
        { seats: 2, attending: 0 },
        { seats: 3, attending: null },
      ]),
    })('e1')

    expect(isErr(result)).toBe(false)
    expect(!isErr(result) && result.value).toMatchObject({
      groupsInvited: 3,
      groupsAttending: 1,
      groupsDeclined: 1,
      groupsPending: 1,
      seatsConfirmed: 3,
    })
  })

  it('un evento sin invitados no es un error: es un evento recién creado', async () => {
    const result = await getEventStats({ rsvp: repo([]) })('e1')
    expect(!isErr(result) && result.value.empty).toBe(true)
  })

  it('si la base no responde, el fallo se envuelve en storage_failure', async () => {
    const roto: RsvpRepository = {
      append: vi.fn(),
      reopenedAtFor: vi.fn(async () => null),
      latestFor: vi.fn(),
      tallyRowsFor: vi.fn(async () => {
        throw new Error('sin conexión')
      }),
      respondedAtsFor: vi.fn(async () => []),
latestByEvent: async () => new Map(),
    }

    const result = await getEventStats({ rsvp: roto })('e1')
    expect(isErr(result) && result.error.kind).toBe('storage_failure')
  })
})

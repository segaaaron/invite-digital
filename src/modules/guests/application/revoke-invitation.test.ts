import { describe, expect, it } from 'vitest'
import { reopenRsvp, revokeInvitation } from './revoke-invitation'
import type { GuestGroupRepository } from './ports'
import { isErr, isOk } from '@/shared/result'

const NOW = new Date('2026-09-16T12:00:00Z')

function repo() {
  const revocadas: Array<{ eventId: string; id: string }> = []
  const reabiertas: string[] = []
  const groups: GuestGroupRepository = {
    insert: async () => {},
    listByEvent: async () => [],
    findByTokenHash: async () => null,
    findById: async (eventId, id) =>
      eventId === 'e1' && id === 'g1' ? { id, eventId, label: 'Ana', seats: 1, revokedAt: null, openedAt: null } : null,
    revoke: async (eventId, id) => void revocadas.push({ eventId, id }),
    markOpened: async () => {},
    remove: async () => {},
    markSent: async () => {},
    replaceToken: async () => {},
    tokensOf: async () => new Map(),
    reopenRsvp: async (_e, id) => void reabiertas.push(id),
    setPhone: async () => {},
    setSeats: async () => {},
    setLabel: async () => {},
  }
  return { groups, revocadas, reabiertas }
}

describe('revokeInvitation', () => {
  it('revoca la invitación del evento', async () => {
    const { groups, revocadas } = repo()
    const r = await revokeInvitation({ groups, clock: () => NOW })({ eventId: 'e1', id: 'g1' })

    expect(isOk(r)).toBe(true)
    expect(revocadas).toEqual([{ eventId: 'e1', id: 'g1' }])
  })

  it('una invitación de otro evento es not_found, no un «hecho» sin efecto', async () => {
    const { groups, revocadas } = repo()
    const r = await revokeInvitation({ groups, clock: () => NOW })({ eventId: 'e2', id: 'g1' })

    expect(isErr(r) && r.error.kind).toBe('not_found')
    expect(revocadas).toHaveLength(0)
  })
})

describe('reopenRsvp', () => {
  it('reabre la confirmación de una invitación del evento', async () => {
    const { groups, reabiertas } = repo()
    expect(isOk(await reopenRsvp({ groups, clock: () => NOW })({ eventId: 'e1', id: 'g1' }))).toBe(true)
    expect(reabiertas).toEqual(['g1'])
  })

  it('no reabre la de otro evento', async () => {
    const { groups, reabiertas } = repo()
    const r = await reopenRsvp({ groups, clock: () => NOW })({ eventId: 'e2', id: 'g1' })
    expect(isErr(r) && r.error.kind).toBe('not_found')
    expect(reabiertas).toHaveLength(0)
  })
})

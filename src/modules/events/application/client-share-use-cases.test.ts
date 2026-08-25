import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { Minter } from '@/shared/security/tokens'
import type { EventInput } from '../domain/event'
import { createClientShare, resolveClientShare } from './client-share-use-cases'
import type { ClientShareRepository, ClientShareRow, EventRepository } from './ports'

const NOW = new Date('2026-08-19T12:00:00Z')
const HASH = Buffer.alloc(32, 6)
const minter: Minter = { mint: () => ({ token: 'token-cliente', hash: HASH }), hashOf: () => HASH }

const fila = (overrides: Partial<ClientShareRow> = {}): ClientShareRow => ({
  id: 's1',
  eventId: 'e1',
  expiresAt: new Date('2026-10-01T00:00:00Z'),
  revokedAt: null,
  ...overrides,
})

const eventRow: EventInput = {
  id: 'e1',
  userId: null,
  slug: 'boda-ana',
  title: 'Boda de Ana',
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
  retentionDays: 90,
}

const shares = (row: ClientShareRow | null) => {
  const inserted: Array<{ tokenHash: Buffer; expiresAt: Date }> = []
  const repo: ClientShareRepository = {
    insert: async (share) => void inserted.push(share),
    findByTokenHash: async () => row,
    findLiveByEvent: async () => row,
    revoke: async () => {},
  }
  return { repo, inserted }
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
  findBySlug: async () => null,
  findById: async () => eventRow,
  remove: async () => {},
}

describe('createClientShare', () => {
  it('guarda el hash y devuelve el token en claro con su caducidad', async () => {
    const store = shares(null)
    const result = await createClientShare({ shares: store.repo, minter, ids: () => 's1', clock: () => NOW })({ eventId: 'e1' })

    expect(isOk(result) && result.value.token).toBe('token-cliente')
    expect(store.inserted[0]?.tokenHash.equals(HASH)).toBe(true)
    expect(store.inserted[0]?.expiresAt.toISOString()).toBe('2026-10-18T12:00:00.000Z')
  })
})

describe('resolveClientShare', () => {
  it('devuelve el evento con un enlace vivo', async () => {
    const result = await resolveClientShare({ shares: shares(fila()).repo, events, minter, clock: () => NOW })('token-cliente')
    expect(isOk(result) && result.value.slug).toBe('boda-ana')
  })

  it('un enlace caducado es not_found', async () => {
    const result = await resolveClientShare({
      shares: shares(fila({ expiresAt: new Date('2026-08-01T00:00:00Z') })).repo,
      events,
      minter,
      clock: () => NOW,
    })('token-cliente')
    expect(isErr(result) && result.error.kind).toBe('not_found')
  })

  it('un enlace revocado es not_found', async () => {
    const result = await resolveClientShare({ shares: shares(fila({ revokedAt: NOW })).repo, events, minter, clock: () => NOW })(
      'token-cliente',
    )
    expect(isErr(result) && result.error.kind).toBe('not_found')
  })

  it('un token desconocido es not_found', async () => {
    const result = await resolveClientShare({ shares: shares(null).repo, events, minter, clock: () => NOW })('token-cliente')
    expect(isErr(result) && result.error.kind).toBe('not_found')
  })
})

import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { Minter } from '@/shared/security/tokens'
import { addGuestGroup } from './add-guest-group'
import type { GuestGroupRepository, GuestGroupRow } from './ports'
import { resolveByToken } from './resolve-by-token'

const HASH = Buffer.alloc(32, 3)
const minter: Minter = { mint: () => ({ token: 'token-visible', hash: HASH }), hashOf: () => HASH }
const NOW = new Date('2026-08-19T12:00:00Z')

const fila = (overrides: Partial<GuestGroupRow> = {}): GuestGroupRow => ({
  id: 'g1',
  eventId: 'e1',
  label: 'Familia Rojas',
  seats: 4,
  revokedAt: null,
  openedAt: null,
  ...overrides,
})

const repo = (row: GuestGroupRow | null) => {
  const inserted: Array<{ hash: Buffer }> = []
  const opened: Array<{ id: string; at: Date }> = []
  const groups: GuestGroupRepository = {
    insert: async (_group, tokenHash) => void inserted.push({ hash: tokenHash }),
    listByEvent: async () => [],
    findByTokenHash: async () => row,
    findById: async () => row,
    markSent: async () => {},
    revoke: async () => {},
    markOpened: async (id, at) => void opened.push({ id, at }),
  }
  return { groups, inserted, opened }
}

// La capacidad entra como argumento. `guests` no importa el módulo de planes: la regla
// de cuántos grupos caben es comercial y va a cambiar, y atarla aquí volvería
// dependientes para siempre a dos modulos que hoy son independientes.
const SIN_LIMITE = { allowance: { maxGuestGroups: null }, currentGroups: 0 } as const
const input = { eventId: 'e1', label: 'Familia Rojas', seats: 4 }

describe('addGuestGroup', () => {
  it('guarda el hash y devuelve el token en claro', async () => {
    const { groups, inserted } = repo(null)
    const result = await addGuestGroup({ groups, minter, ids: () => 'g1' })({ ...input, ...SIN_LIMITE })

    expect(isOk(result) && result.value.token).toBe('token-visible')
    expect(inserted[0]?.hash.equals(HASH)).toBe(true)
  })

  it('no guarda nada cuando el dominio rechaza los cupos', async () => {
    const { groups, inserted } = repo(null)
    const result = await addGuestGroup({ groups, minter, ids: () => 'g1' })({ ...input, seats: 0, ...SIN_LIMITE })

    expect(isErr(result) && result.error.kind).toBe('invalid_seats')
    expect(inserted).toHaveLength(0)
  })

  it('rechaza el grupo que pasa del límite del plan', async () => {
    const { groups, inserted } = repo(null)
    const result = await addGuestGroup({ groups, minter, ids: () => 'g1' })({
      ...input,
      allowance: { maxGuestGroups: 2 },
      currentGroups: 2,
    })

    expect(isErr(result) && result.error.kind).toBe('plan_limit_reached')
    // Y no llega a la base: acuñar un token y guardarlo para luego rechazarlo dejaría
    // un enlace válido de un grupo que no existe.
    expect(inserted).toHaveLength(0)
  })

  it('el que hace tope justo sí entra', async () => {
    const { groups } = repo(null)
    const result = await addGuestGroup({ groups, minter, ids: () => 'g1' })({
      ...input,
      allowance: { maxGuestGroups: 2 },
      currentGroups: 1,
    })

    expect(isOk(result)).toBe(true)
  })

  it('sin límite no rechaza nunca', async () => {
    const { groups } = repo(null)
    const result = await addGuestGroup({ groups, minter, ids: () => 'g1' })({
      ...input,
      allowance: { maxGuestGroups: null },
      currentGroups: 9999,
    })

    expect(isOk(result)).toBe(true)
  })
})

describe('resolveByToken', () => {
  it('devuelve el grupo y marca la primera apertura', async () => {
    const { groups, opened } = repo(fila())
    const result = await resolveByToken({ groups, minter, clock: () => NOW })('token-visible')

    expect(isOk(result) && result.value.label).toBe('Familia Rojas')
    expect(opened).toEqual([{ id: 'g1', at: NOW }])
  })

  it('no vuelve a marcar la apertura si ya estaba marcada', async () => {
    const { groups, opened } = repo(fila({ openedAt: new Date('2026-08-01T00:00:00Z') }))
    await resolveByToken({ groups, minter, clock: () => NOW })('token-visible')
    expect(opened).toHaveLength(0)
  })

  it('devuelve not_found con un token desconocido', async () => {
    const { groups } = repo(null)
    const result = await resolveByToken({ groups, minter, clock: () => NOW })('token-visible')
    expect(isErr(result) && result.error.kind).toBe('not_found')
  })

  it('devuelve revoked con una invitación revocada', async () => {
    const { groups } = repo(fila({ revokedAt: new Date('2026-08-01T00:00:00Z') }))
    const result = await resolveByToken({ groups, minter, clock: () => NOW })('token-visible')
    expect(isErr(result) && result.error.kind).toBe('revoked')
  })

  it('no marca la apertura de una invitación revocada', async () => {
    const { groups, opened } = repo(fila({ revokedAt: new Date('2026-08-01T00:00:00Z') }))
    await resolveByToken({ groups, minter, clock: () => NOW })('token-visible')
    expect(opened).toHaveLength(0)
  })

  it('convierte una caída de la base en storage_failure', async () => {
    const groups: GuestGroupRepository = {
      insert: async () => {},
      listByEvent: async () => [],
      findById: async () => null,
      markSent: async () => {},
      findByTokenHash: async () => {
        throw new Error('conexión rechazada')
      },
      revoke: async () => {},
      markOpened: async () => {},
    }
    const result = await resolveByToken({ groups, minter, clock: () => NOW })('token-visible')
    expect(isErr(result) && result.error.kind).toBe('storage_failure')
  })
})

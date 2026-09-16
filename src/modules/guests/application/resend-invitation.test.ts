import { describe, expect, it } from 'vitest'
import { resendInvitation } from './resend-invitation'
import type { GuestGroupRepository, GuestGroupRow } from './ports'
import { isErr, isOk } from '@/shared/result'

const NOW = new Date('2026-08-22T12:00:00Z')

function repo(row: GuestGroupRow | null) {
  const tokens: Buffer[] = []
  const enviados: Date[] = []
  const groups: GuestGroupRepository = {
    insert: async () => {},
    listByEvent: async () => [],
    findByTokenHash: async () => null,
    findById: async (eventId, id) => (row !== null && row.eventId === eventId && row.id === id ? row : null),
    revoke: async () => {},
    markOpened: async () => {},
    remove: async () => {},
    markSent: async (_e, _id, at) => void enviados.push(at),
    replaceToken: async (_e, _id, hash) => void tokens.push(hash),
    reopenRsvp: async () => {},
    setPhone: async () => {},
    setSeats: async () => {},
    setLabel: async () => {},
  }
  return { groups, tokens, enviados }
}

const fila = (over: Partial<GuestGroupRow> = {}): GuestGroupRow => ({
  id: 'g1',
  eventId: 'e1',
  label: 'Familia Rojas Peña',
  seats: 4,
  revokedAt: null,
  openedAt: null,
  invitationSentAt: null,
  phone: null,
  ...over,
})

const minter = {
  mint: () => ({ token: 'token-nuevo', hash: Buffer.alloc(32, 7) }),
  hashOf: (token: string) => Buffer.alloc(32, token.length),
}

describe('resendInvitation', () => {
  it('acuña un token nuevo, lo guarda y marca el reparto', async () => {
    const { groups, tokens, enviados } = repo(fila())

    const result = await resendInvitation({ groups, minter, clock: () => NOW })({ eventId: 'e1', id: 'g1' })

    expect(isOk(result) && result.value.token).toBe('token-nuevo')
    expect(tokens).toHaveLength(1)
    expect(enviados).toEqual([NOW])
  })

  it('no reenvía una invitación revocada', async () => {
    // Revocar es una decisión que se deshace a propósito, no de refilón al pulsar
    // «reenviar»: si bastara con eso, un clic devolvería el acceso a quien se lo quitaron.
    const { groups, tokens } = repo(fila({ revokedAt: new Date('2026-08-01') }))

    const result = await resendInvitation({ groups, minter, clock: () => NOW })({ eventId: 'e1', id: 'g1' })

    expect(isErr(result) && result.error.kind).toBe('revoked')
    expect(tokens).toHaveLength(0)
  })

  it('un grupo que no existe es not_found', async () => {
    const { groups } = repo(null)
    const result = await resendInvitation({ groups, minter, clock: () => NOW })({ eventId: 'e1', id: 'fantasma' })
    expect(isErr(result) && result.error.kind).toBe('not_found')
  })

  it('una invitación de otro evento es not_found y su enlace no cambia', async () => {
    // El identificador llega del navegador. Sin el evento en la búsqueda, reenviar desde la
    // boda propia rotaba el enlace de una ajena y devolvía el nuevo a quien no es de allí.
    const { groups, tokens } = repo(fila({ eventId: 'e2' }))
    const result = await resendInvitation({ groups, minter, clock: () => NOW })({ eventId: 'e1', id: 'g1' })

    expect(isErr(result) && result.error.kind).toBe('not_found')
    expect(tokens).toHaveLength(0)
  })
})

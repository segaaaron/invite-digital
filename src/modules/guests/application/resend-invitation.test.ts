import { describe, expect, it } from 'vitest'
import { asegurarEnlace, enviarInvitacion, resendInvitation } from './resend-invitation'
import type { GuestGroupRepository, GuestGroupRow } from './ports'
import { isErr, isOk } from '@/shared/result'

const NOW = new Date('2026-08-22T12:00:00Z')

function repo(row: GuestGroupRow | null, guardados: ReadonlyMap<string, string> = new Map()) {
  const tokens: Buffer[] = []
  const adoptados: Buffer[] = []
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
    adoptToken: async (_e, _id, hash) => void adoptados.push(hash),
    tokensOf: async () => guardados,
    reopenRsvp: async () => {},
    setPhone: async () => {},
    setSeats: async () => {},
    setLabel: async () => {},
  }
  return { groups, tokens, adoptados, enviados }
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

describe('enviarInvitacion', () => {
  it('con el enlace guardado lo usa tal cual y marca el reparto: el que ya tiene el invitado sigue valiendo', async () => {
    const { groups, tokens, enviados } = repo(fila(), new Map([['g1', 'token-guardado']]))
    const result = await enviarInvitacion({ groups, minter, clock: () => NOW })({ eventId: 'e1', id: 'g1' })
    expect(isOk(result) && result.value.token).toBe('token-guardado')
    expect(tokens).toHaveLength(0)
    expect(enviados).toEqual([NOW])
  })

  it('sin enlace guardado (invitaciones de antes) acuña uno sin invalidar el repartido', async () => {
    const { groups, tokens, adoptados } = repo(fila())
    const result = await enviarInvitacion({ groups, minter, clock: () => NOW })({ eventId: 'e1', id: 'g1' })
    expect(isOk(result) && result.value.token).toBe('token-nuevo')
    // Adoptar, nunca rotar: el enlace que ya circula por el chat sigue abriendo.
    expect(adoptados).toHaveLength(1)
    expect(tokens).toHaveLength(0)
  })

  it('ya enviada y sin enlace guardado: se le suma uno y el que tiene el invitado sigue valiendo', async () => {
    const { groups, tokens, adoptados, enviados } = repo(fila({ invitationSentAt: NOW }))
    const result = await enviarInvitacion({ groups, minter, clock: () => NOW })({ eventId: 'e1', id: 'g1' })
    expect(isOk(result) && result.value.token).toBe('token-nuevo')
    expect(adoptados).toHaveLength(1)
    expect(tokens).toHaveLength(0)
    expect(enviados).toEqual([NOW])
  })

  it('no envía una revocada', async () => {
    const { groups } = repo(fila({ revokedAt: NOW }), new Map([['g1', 'token-guardado']]))
    expect(isErr(await enviarInvitacion({ groups, minter, clock: () => NOW })({ eventId: 'e1', id: 'g1' }))).toBe(true)
  })
})

describe('asegurarEnlace', () => {
  it('con el enlace guardado lo devuelve y no escribe nada: enseñarlo no es repartirlo', async () => {
    const { groups, tokens, adoptados, enviados } = repo(fila(), new Map([['g1', 'token-guardado']]))
    const result = await asegurarEnlace({ groups, minter })({ eventId: 'e1', id: 'g1' })
    expect(isOk(result) && result.value.token).toBe('token-guardado')
    expect([tokens, adoptados, enviados].every((l) => l.length === 0)).toBe(true)
  })

  it('sin enlace guardado acuña uno, conserva el anterior y tampoco marca el reparto', async () => {
    const { groups, adoptados, enviados } = repo(fila({ invitationSentAt: NOW }))
    const result = await asegurarEnlace({ groups, minter })({ eventId: 'e1', id: 'g1' })
    expect(isOk(result) && result.value.token).toBe('token-nuevo')
    expect(adoptados).toHaveLength(1)
    expect(enviados).toHaveLength(0)
  })

  it('una revocada no da enlace', async () => {
    const { groups, adoptados } = repo(fila({ revokedAt: NOW }))
    const result = await asegurarEnlace({ groups, minter })({ eventId: 'e1', id: 'g1' })
    expect(isErr(result) && result.error.kind).toBe('revoked')
    expect(adoptados).toHaveLength(0)
  })

  it('una invitación de otro evento es not_found', async () => {
    const { groups, adoptados } = repo(fila({ eventId: 'e2' }))
    expect(isErr(await asegurarEnlace({ groups, minter })({ eventId: 'e1', id: 'g1' }))).toBe(true)
    expect(adoptados).toHaveLength(0)
  })
})

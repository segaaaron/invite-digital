import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import type { Event } from '@/modules/events'
import { eventError } from '@/modules/events/domain/errors'
import { guestError } from '@/modules/guests/domain/errors'
import type { GuestGroup } from '@/modules/guests'
import { getInvitation } from './get-invitation'
import type { RsvpRepository } from './ports'

const grupo: GuestGroup = { id: 'g1', eventId: 'e1', label: 'Familia Rojas', seats: 4, revokedAt: null, invitationSentAt: null, phone: null, createdAt: new Date(0) }

const evento: Event = {
  id: 'e1',
  userId: null,
  slug: 'boda-ana',
  title: 'Boda de Ana',
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
  retentionDays: 90, currency: 'BOB' as const, messageTemplate: null, venue: null,
}

const rsvp: RsvpRepository = {
  append: async () => {},
  reopenedAtFor: async () => null,
  latestFor: async () => ({ attending: 2, responderName: null, message: null, respondedAt: new Date('2026-10-01T12:00:00Z') }),
  tallyRowsFor: async () => [],
    respondedAtsFor: async () => [],
latestByEvent: async () => new Map(),
}

const deps = (overrides: Partial<Parameters<typeof getInvitation>[0]> = {}) => ({
  resolveGroup: async () => ok(grupo),
  findEventById: async () => ok(evento),
  rsvp,
  ...overrides,
})

describe('getInvitation', () => {
  it('devuelve grupo, evento y última respuesta', async () => {
    const result = await getInvitation(deps())('tok')
    expect(isOk(result) && result.value.group.label).toBe('Familia Rojas')
    expect(isOk(result) && result.value.latest?.attending).toBe(2)
  })

  it('un evento en borrador no tiene invitación todavía', async () => {
    const result = await getInvitation(deps({ findEventById: async () => ok({ ...evento, status: 'draft' }) }))('tok')
    expect(isErr(result) && result.error.kind).toBe('invitation_not_found')
  })

  it('un evento cerrado sí se muestra: los enlaces siguen valiendo', async () => {
    const result = await getInvitation(deps({ findEventById: async () => ok({ ...evento, status: 'closed' }) }))('tok')
    expect(isOk(result)).toBe(true)
  })

  it('distingue la caída de la base de un token desconocido', async () => {
    const caida = await getInvitation(deps({ resolveGroup: async () => err(guestError('storage_failure', 'base caída')) }))('tok')
    expect(isErr(caida) && caida.error.kind).toBe('storage_failure')

    const desconocido = await getInvitation(deps({ resolveGroup: async () => err(guestError('not_found', 'sin grupo')) }))('tok')
    expect(isErr(desconocido) && desconocido.error.kind).toBe('invitation_not_found')
  })

  it('traduce la invitación revocada', async () => {
    const result = await getInvitation(deps({ resolveGroup: async () => err(guestError('revoked', 'revocada')) }))('tok')
    expect(isErr(result) && result.error.kind).toBe('invitation_revoked')
  })

  it('un evento que ya no existe es fallo de almacenamiento, no 404 del invitado', async () => {
    const result = await getInvitation(deps({ findEventById: async () => err(eventError('not_found', 'sin evento')) }))('tok')
    expect(isErr(result) && result.error.kind).toBe('storage_failure')
  })
})

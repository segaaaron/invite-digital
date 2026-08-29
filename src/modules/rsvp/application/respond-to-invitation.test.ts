import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import type { Event } from '@/modules/events'
import { eventError } from '@/modules/events/domain/errors'
import { guestError } from '@/modules/guests/domain/errors'
import type { GuestGroup } from '@/modules/guests'
import type { RsvpResponse } from '../domain/rsvp-response'
import type { RsvpRepository } from './ports'
import { respondToInvitation } from './respond-to-invitation'

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

const repo = () => {
  const appended: RsvpResponse[] = []
  const rsvp: RsvpRepository = {
    append: async (response) => void appended.push(response),
    latestFor: async () => null,
    tallyRowsFor: async () => [],
    respondedAtsFor: async () => [],
latestByEvent: async () => new Map(),
  }
  return { rsvp, appended }
}

const deps = (overrides: Partial<Parameters<typeof respondToInvitation>[0]> = {}) => ({
  resolveGroup: async () => ok(grupo),
  findEventById: async () => ok(evento),
  rsvp: repo().rsvp,
  ids: () => crypto.randomUUID(),
  clock: () => new Date('2026-11-01T12:00:00Z'),
  ...overrides,
})

describe('respondToInvitation', () => {
  it('anexa una respuesta nueva, sin actualizar la anterior', async () => {
    const store = repo()
    const responder = respondToInvitation(deps({ rsvp: store.rsvp }))

    await responder({ token: 'tok', attending: 3, responderName: null, message: null })
    await responder({ token: 'tok', attending: 2, responderName: null, message: 'Al final somos dos' })

    expect(store.appended.map((r) => r.attending)).toEqual([3, 2])
  })

  it('rechaza pasada la fecha límite', async () => {
    const result = await respondToInvitation(deps({ clock: () => new Date('2026-11-21T12:00:00Z') }))({
      token: 'tok',
      attending: 1,
      responderName: null,
      message: null,
    })
    expect(isErr(result) && result.error.kind).toBe('rsvp_closed')
  })

  it('acepta el propio día de la fecha límite', async () => {
    const result = await respondToInvitation(deps({ clock: () => new Date('2026-11-20T23:00:00Z') }))({
      token: 'tok',
      attending: 1,
      responderName: null,
      message: null,
    })
    expect(isOk(result)).toBe(true)
  })

  it('rechaza un evento que no está en marcha', async () => {
    const result = await respondToInvitation(deps({ findEventById: async () => ok({ ...evento, status: 'draft' }) }))({
      token: 'tok',
      attending: 1,
      responderName: null,
      message: null,
    })
    expect(isErr(result) && result.error.kind).toBe('rsvp_closed')
  })

  it('traduce una invitación revocada a invitation_revoked', async () => {
    const result = await respondToInvitation(deps({ resolveGroup: async () => err(guestError('revoked', 'revocada')) }))({
      token: 'tok',
      attending: 1,
      responderName: null,
      message: null,
    })
    expect(isErr(result) && result.error.kind).toBe('invitation_revoked')
  })

  it('traduce un token desconocido a invitation_not_found', async () => {
    const result = await respondToInvitation(deps({ resolveGroup: async () => err(guestError('not_found', 'sin grupo')) }))({
      token: 'tok',
      attending: 1,
      responderName: null,
      message: null,
    })
    expect(isErr(result) && result.error.kind).toBe('invitation_not_found')
  })

  it('rechaza más asistentes que cupos', async () => {
    const result = await respondToInvitation(deps())({ token: 'tok', attending: 5, responderName: null, message: null })
    expect(isErr(result) && result.error.kind).toBe('too_many_seats')
  })

  it('no consulta el evento si el token no resuelve', async () => {
    let consultas = 0
    await respondToInvitation(
      deps({
        resolveGroup: async () => err(guestError('not_found', 'sin grupo')),
        findEventById: async () => {
          consultas += 1
          return err(eventError('not_found', 'no debería llegar aquí'))
        },
      }),
    )({ token: 'tok', attending: 1, responderName: null, message: null })
    expect(consultas).toBe(0)
  })

  it('no anexa nada cuando el dominio rechaza la respuesta', async () => {
    const store = repo()
    await respondToInvitation(deps({ rsvp: store.rsvp }))({ token: 'tok', attending: 9, responderName: null, message: null })
    expect(store.appended).toHaveLength(0)
  })
})

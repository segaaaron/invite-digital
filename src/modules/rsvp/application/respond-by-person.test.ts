import { describe, expect, it, vi } from 'vitest'
import { ok, isErr } from '@/shared/result'
import type { GuestPerson } from '@/modules/guests'
import { respondByPerson } from './respond-by-person'

const GRUPO = { id: 'g1', eventId: 'e1', label: 'Familia Rojas', seats: 4, revokedAt: null }
const EVENTO = { id: 'e1', slug: 'boda', status: 'live', rsvpDeadline: '2030-01-01', title: 'Boda', locale: 'es' }

const persona = (id: string, fullName: string): GuestPerson =>
  ({ id, guestGroupId: 'g1', fullName, isCompanion: false, dietaryNote: null, vip: false, attending: null, email: null }) as GuestPerson

const deps = (extra: Partial<Parameters<typeof respondByPerson>[0]> = {}) => {
  const setAttendance = vi.fn(async () => {})
  const append = vi.fn(async () => {})
  return {
    setAttendance,
    append,
    dependencias: {
      resolveGroup: async () => ok(GRUPO),
      findEventById: async () => ok(EVENTO),
      peopleOf: async () => [persona('p1', 'Ana Rojas'), persona('p2', 'Luis Peña'), persona('p3', 'Mateo Peña')],
      setAttendance,
      rsvp: {
        append,
        reopenedAtFor: async () => null,
        latestFor: async () => null,
        tallyRowsFor: async () => [],
        respondedAtsFor: async () => [],
        latestByEvent: async () => new Map(),
      },
      ids: () => 'r1',
      clock: () => new Date('2026-09-16T00:00:00Z'),
      ...extra,
    } as Parameters<typeof respondByPerson>[0],
  }
}

describe('respondByPerson', () => {
  it('cuenta a los marcados y deja en «no» al resto del grupo', async () => {
    const { dependencias, setAttendance, append } = deps()

    const salida = await respondByPerson(dependencias)({
      token: 'tok',
      vienen: ['p1', 'p3'],
      extra: 0,
      responderName: 'Ana',
      message: null,
    })

    expect(!isErr(salida) && salida.value.attending).toBe(2)
    expect(append).toHaveBeenCalledTimes(1)
    expect(setAttendance).toHaveBeenCalledWith('e1', 'p1', 'yes')
    expect(setAttendance).toHaveBeenCalledWith('e1', 'p2', 'no')
    expect(setAttendance).toHaveBeenCalledWith('e1', 'p3', 'yes')
  })

  it('ignora a quien no es de ese grupo: el formulario lo escribe quien manda el POST', async () => {
    const { dependencias } = deps()

    const salida = await respondByPerson(dependencias)({
      token: 'tok',
      vienen: ['p1', 'de-otra-boda'],
      extra: 0,
      responderName: null,
      message: null,
    })

    expect(!isErr(salida) && salida.value.attending).toBe(1)
  })

  it('suma los acompañantes sin nombre hasta los cupos del grupo', async () => {
    const { dependencias } = deps()

    const salida = await respondByPerson(dependencias)({ token: 'tok', vienen: ['p1'], extra: 1, responderName: null, message: null })

    expect(!isErr(salida) && salida.value.attending).toBe(2)
  })

  it('no acepta una segunda respuesta: se confirma una sola vez', async () => {
    const { dependencias } = deps()
    const conRespuesta = {
      ...dependencias,
      rsvp: {
        ...dependencias.rsvp,
        latestFor: async () => ({ attending: 3, responderName: null, message: null, respondedAt: new Date('2026-09-15T00:00:00Z') }),
      },
    }

    const salida = await respondByPerson(conRespuesta)({ token: 'tok', vienen: ['p1'], extra: 0, responderName: null, message: null })

    expect(isErr(salida) && salida.error.kind).toBe('already_answered')
  })

  it('salvo que el atelier la haya reabierto después de esa respuesta', async () => {
    const { dependencias } = deps()
    const reabierta = {
      ...dependencias,
      rsvp: {
        ...dependencias.rsvp,
        latestFor: async () => ({ attending: 3, responderName: null, message: null, respondedAt: new Date('2026-09-15T00:00:00Z') }),
        reopenedAtFor: async () => new Date('2026-09-15T12:00:00Z'),
      },
    }

    const salida = await respondByPerson(reabierta)({ token: 'tok', vienen: ['p1', 'p2'], extra: 0, responderName: null, message: null })

    expect(!isErr(salida) && salida.value.attending).toBe(2)
  })
})

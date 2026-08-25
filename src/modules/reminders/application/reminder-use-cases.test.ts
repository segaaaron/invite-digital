import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { ReminderCandidate } from '../domain/due'
import { FakeReminderRepository } from './fake-reminder-repository'
import { listDueReminders, markReminderSent } from './reminder-use-cases'

const HOY = new Date('2026-09-25T12:00:00Z')
const clock = () => HOY

const EVENTO = { id: 'e1', locale: 'es', rsvpDeadline: new Date('2026-09-28T00:00:00Z') }

const CANDIDATO: ReminderCandidate = {
  id: 'g1',
  label: 'Familia Rojas Peña',
  phone: '+59170011122',
  seats: 4,
  revoked: false,
  sentAt: new Date('2026-09-15T00:00:00Z'),
  openedAt: new Date('2026-09-15T01:00:00Z'),
  respondedAt: null,
  lastRemindedAt: {},
}

describe('listDueReminders', () => {
  it('devuelve la cola del día que marca el reloj de la frontera', async () => {
    const cola = await listDueReminders({ reminders: new FakeReminderRepository([CANDIDATO]), clock })(EVENTO)

    expect(isOk(cola) && cola.value.map((f) => f.kind)).toEqual(['sin_respuesta'])
  })

  it('un fallo de la base sale como fallo, no como cola vacía', async () => {
    const rota = new FakeReminderRepository()
    rota.listCandidates = async () => {
      throw new Error('CONNECTION_ENDED')
    }

    const cola = await listDueReminders({ reminders: rota, clock })(EVENTO)

    // Una cola vacía diría «no hay nada que recordar hoy», que es justo lo contrario de
    // lo que pasó: no se sabe.
    expect(isErr(cola) && cola.error.kind).toBe('storage_failure')
  })
})

describe('markReminderSent', () => {
  it('anota el recordatorio con la fecha del reloj', async () => {
    const repo = new FakeReminderRepository([CANDIDATO], { g1: 'e1' })

    const hecho = await markReminderSent({ reminders: repo, clock })({
      eventId: 'e1',
      guestGroupId: 'g1',
      kind: 'sin_respuesta',
    })

    expect(isOk(hecho)).toBe(true)
    expect(repo.logged).toEqual([{ guestGroupId: 'g1', kind: 'sin_respuesta', sentAt: HOY }])
  })

  it('un grupo de otro evento no escribe nada', async () => {
    const repo = new FakeReminderRepository([], { ajeno: 'otro-evento' })

    const hecho = await markReminderSent({ reminders: repo, clock })({
      eventId: 'e1',
      guestGroupId: 'ajeno',
      kind: 'sin_respuesta',
    })

    expect(isErr(hecho) && hecho.error.kind).toBe('not_found')
    expect(repo.logged).toEqual([])
  })

  it('un grupo que no existe tampoco', async () => {
    const repo = new FakeReminderRepository()

    const hecho = await markReminderSent({ reminders: repo, clock })({
      eventId: 'e1',
      guestGroupId: 'fantasma',
      kind: 'sin_abrir',
    })

    expect(isErr(hecho) && hecho.error.kind).toBe('not_found')
    expect(repo.logged).toEqual([])
  })
})

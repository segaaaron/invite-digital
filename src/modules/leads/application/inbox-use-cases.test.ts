import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { EstadoConsulta } from '../domain/pipeline'
import type { ConsultationInbox, ConsultationRow } from './ports'
import { moveConsultation } from './inbox-use-cases'

const fila = (status: EstadoConsulta): ConsultationRow => ({
  id: 'c1',
  name: 'María Rojas',
  email: null,
  phone: '+59170011223',
  categorySlug: 'boda',
  eventDate: '2026-10-18',
  message: null,
  locale: 'es',
  status,
  note: null,
  statusChangedAt: null,
  event: null,
  createdAt: new Date('2026-09-10T12:00:00Z'),
})

function bandeja(inicial: ConsultationRow | null, gana = true) {
  const escrituras: unknown[] = []
  const inbox: ConsultationInbox = {
    list: async () => (inicial ? [inicial] : []),
    find: async () => inicial,
    move: async (id, from, patch) => {
      escrituras.push({ id, from, ...patch })
      return gana
    },
    countNew: async () => 0,
    anonymizeBefore: async () => 0,
  }
  return { inbox, escrituras }
}

const AHORA = new Date('2026-09-14T15:00:00Z')

describe('moveConsultation', () => {
  it('escribe la transición condicionada al estado leído', async () => {
    const { inbox, escrituras } = bandeja(fila('new'))
    const r = await moveConsultation({ inbox, clock: () => AHORA })({ id: 'c1', to: 'contacted', note: '', eventId: '' })
    expect(isOk(r)).toBe(true)
    expect(escrituras).toEqual([{ id: 'c1', from: 'new', status: 'contacted', note: null, eventId: null, at: AHORA }])
  })

  it('una consulta que no existe no escribe nada', async () => {
    const { inbox, escrituras } = bandeja(null)
    const r = await moveConsultation({ inbox, clock: () => AHORA })({ id: 'x', to: 'contacted', note: '', eventId: '' })
    expect(isErr(r) && r.error.kind).toBe('not_found')
    expect(escrituras).toEqual([])
  })

  it('perderla sin motivo no escribe nada', async () => {
    const { inbox, escrituras } = bandeja(fila('contacted'))
    const r = await moveConsultation({ inbox, clock: () => AHORA })({ id: 'c1', to: 'lost', note: ' ', eventId: '' })
    expect(isErr(r) && r.error.kind).toBe('missing_note')
    expect(escrituras).toEqual([])
  })

  it('si otro admin la movió antes, lo dice en vez de dar por buena la escritura', async () => {
    const { inbox } = bandeja(fila('new'), false)
    const r = await moveConsultation({ inbox, clock: () => AHORA })({ id: 'c1', to: 'contacted', note: '', eventId: '' })
    expect(isErr(r) && r.error.kind).toBe('conflict')
  })

  it('la boda solo se enlaza al ganarla', async () => {
    const { inbox, escrituras } = bandeja(fila('new'))
    await moveConsultation({ inbox, clock: () => AHORA })({ id: 'c1', to: 'contacted', note: '', eventId: 'e1' })
    expect(escrituras).toMatchObject([{ eventId: null }])

    const ganada = bandeja(fila('contacted'))
    await moveConsultation({ inbox: ganada.inbox, clock: () => AHORA })({ id: 'c1', to: 'won', note: '', eventId: 'e1' })
    expect(ganada.escrituras).toMatchObject([{ status: 'won', eventId: 'e1' }])
  })
})

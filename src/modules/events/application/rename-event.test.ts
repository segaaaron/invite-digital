import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { Event, EventInput } from '../domain/event'
import type { EventRepository } from './ports'
import { renombrarEvento } from './rename-event'

const fila: EventInput = {
  id: 'e1',
  userId: 'admin',
  slug: 'pedido-ab12cd34',
  title: 'VALERIA',
  eventDate: '2026-11-21',
  rsvpDeadline: '2026-10-31',
  locale: 'es',
  themeKey: 'xv',
  status: 'draft',
  retentionDays: 90,
  currency: 'BOB',
  messageTemplate: null,
  venue: null,
}

function repo() {
  const guardados: Event[] = []
  const events = {
    findById: async (id: string) => (id === 'e1' ? fila : null),
    update: async (e: Event) => void guardados.push(e),
  } as unknown as EventRepository
  return { events, guardados }
}

describe('renombrarEvento', () => {
  it('cambia solo el título: el enlace, el diseño y la fecha se quedan', async () => {
    const { events, guardados } = repo()
    const r = await renombrarEvento({ events })({ eventId: 'e1', title: '  XV de Amanda  ' })
    expect(isOk(r)).toBe(true)
    expect(guardados[0]).toMatchObject({ ...fila, title: 'XV de Amanda' })
  })

  it('un título vacío o de más de 160 se rechaza sin escribir', async () => {
    const { events, guardados } = repo()
    expect(isErr(await renombrarEvento({ events })({ eventId: 'e1', title: '   ' }))).toBe(true)
    expect(isErr(await renombrarEvento({ events })({ eventId: 'e1', title: 'x'.repeat(161) }))).toBe(true)
    expect(guardados).toEqual([])
  })

  it('un evento que no existe es not_found', async () => {
    const r = await renombrarEvento(repo())({ eventId: 'otro', title: 'Algo' })
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})

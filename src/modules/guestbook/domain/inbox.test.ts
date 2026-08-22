import { describe, expect, it } from 'vitest'
import { filterMessages, INBOX_FILTERS, unreadCount, type GuestMessage } from './inbox'

const mensaje = (over: Partial<GuestMessage> = {}): GuestMessage => ({
  responseId: crypto.randomUUID(),
  guestGroupId: 'grupo-1',
  groupLabel: 'Familia Rojas',
  body: 'Qué ganas de celebrar con ustedes.',
  writtenAt: new Date('2026-08-20T10:00:00.000Z'),
  readAt: null,
  featuredAt: null,
  reply: null,
  repliedAt: null,
  ...over,
})

const sinLeer = mensaje({ responseId: 'a', writtenAt: new Date('2026-08-20T10:00:00.000Z') })
const leido = mensaje({
  responseId: 'b',
  writtenAt: new Date('2026-08-19T10:00:00.000Z'),
  readAt: new Date('2026-08-21T09:00:00.000Z'),
})
const destacado = mensaje({
  responseId: 'c',
  writtenAt: new Date('2026-08-18T10:00:00.000Z'),
  readAt: new Date('2026-08-21T09:00:00.000Z'),
  featuredAt: new Date('2026-08-21T09:30:00.000Z'),
})

const todos = [sinLeer, leido, destacado]

describe('filterMessages', () => {
  it('«all» devuelve todos', () => {
    expect(filterMessages(todos, 'all')).toHaveLength(3)
  })

  it('«unread» devuelve solo los de readAt nulo', () => {
    expect(filterMessages(todos, 'unread').map((m) => m.responseId)).toEqual(['a'])
  })

  it('«featured» devuelve solo los de featuredAt no nulo', () => {
    expect(filterMessages(todos, 'featured').map((m) => m.responseId)).toEqual(['c'])
  })

  it('con la lista vacía devuelve vacío en los tres filtros', () => {
    for (const filtro of INBOX_FILTERS) expect(filterMessages([], filtro)).toEqual([])
  })

  it('el orden es por fecha de escritura descendente aunque la entrada venga desordenada', () => {
    // El libro de firmas se lee de lo último a lo primero, y eso no es configurable.
    const desordenado = [destacado, sinLeer, leido]
    expect(filterMessages(desordenado, 'all').map((m) => m.responseId)).toEqual(['a', 'b', 'c'])
  })

  it('también ordena dentro de un filtro', () => {
    const otroSinLeer = mensaje({ responseId: 'd', writtenAt: new Date('2026-08-21T10:00:00.000Z') })
    expect(filterMessages([sinLeer, otroSinLeer], 'unread').map((m) => m.responseId)).toEqual(['d', 'a'])
  })

  it('no muta el array de entrada', () => {
    const entrada = [destacado, sinLeer, leido]
    filterMessages(entrada, 'all')
    expect(entrada.map((m) => m.responseId)).toEqual(['c', 'a', 'b'])
  })
})

describe('unreadCount', () => {
  it('cuenta los que no tienen readAt', () => {
    expect(unreadCount(todos)).toBe(1)
  })

  it('da 0 con la lista vacía', () => {
    expect(unreadCount([])).toBe(0)
  })

  it('da 0 cuando todos están leídos', () => {
    expect(unreadCount([leido, destacado])).toBe(0)
  })

  it('cuenta varios', () => {
    expect(unreadCount([sinLeer, mensaje({ responseId: 'e' }), leido])).toBe(2)
  })
})

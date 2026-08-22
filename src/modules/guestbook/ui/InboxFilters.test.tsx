import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GuestMessage } from '../domain/inbox'
import { InboxFilters } from './InboxFilters'

vi.mock('../actions', () => ({
  markReadAction: vi.fn(async () => ({ ok: true })),
  toggleFeaturedAction: vi.fn(async () => ({ ok: true })),
  replyAction: vi.fn(async () => ({ ok: true })),
}))

const mensaje = (over: Partial<GuestMessage> = {}): GuestMessage => ({
  responseId: 'r1',
  guestGroupId: 'g1',
  groupLabel: 'Familia Rojas',
  body: 'Qué ganas de celebrar.',
  writtenAt: new Date('2026-08-20T15:30:00.000Z'),
  readAt: null,
  featuredAt: null,
  reply: null,
  repliedAt: null,
  ...over,
})

const sinLeer = mensaje({ responseId: 'a', body: 'Mensaje sin leer' })
const leido = mensaje({
  responseId: 'b',
  body: 'Mensaje leído',
  groupLabel: 'Familia Vargas',
  writtenAt: new Date('2026-08-19T10:00:00.000Z'),
  readAt: new Date('2026-08-21T09:00:00.000Z'),
})
const destacado = mensaje({
  responseId: 'c',
  body: 'Mensaje destacado',
  groupLabel: 'Familia Suárez',
  writtenAt: new Date('2026-08-18T10:00:00.000Z'),
  readAt: new Date('2026-08-21T09:00:00.000Z'),
  featuredAt: new Date('2026-08-21T09:30:00.000Z'),
})

const props = { eventId: 'e1', eventSlug: 'boda' }
const todos = [sinLeer, leido, destacado]

describe('InboxFilters', () => {
  it('empieza mostrando todos, del más reciente al más antiguo', () => {
    render(<InboxFilters {...props} messages={[destacado, sinLeer, leido]} />)

    const textos = screen.getAllByRole('article').map((a) => a.textContent ?? '')
    expect(textos[0]).toContain('Mensaje sin leer')
    expect(textos[1]).toContain('Mensaje leído')
    expect(textos[2]).toContain('Mensaje destacado')
  })

  it('el filtro «sin leer» deja solo los que no se han leído', () => {
    render(<InboxFilters {...props} messages={todos} />)

    fireEvent.click(screen.getByRole('button', { name: /Sin leer/ }))
    expect(screen.getByText('Mensaje sin leer')).toBeInTheDocument()
    expect(screen.queryByText('Mensaje leído')).not.toBeInTheDocument()
    expect(screen.queryByText('Mensaje destacado')).not.toBeInTheDocument()
  })

  it('el filtro «destacados» deja solo los destacados', () => {
    render(<InboxFilters {...props} messages={todos} />)

    fireEvent.click(screen.getByRole('button', { name: /Destacados/ }))
    expect(screen.getByText('Mensaje destacado')).toBeInTheDocument()
    expect(screen.queryByText('Mensaje sin leer')).not.toBeInTheDocument()
  })

  it('volver a «todos» los devuelve todos', () => {
    render(<InboxFilters {...props} messages={todos} />)

    fireEvent.click(screen.getByRole('button', { name: /Sin leer/ }))
    fireEvent.click(screen.getByRole('button', { name: /Todos/ }))
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('el filtro activo se anuncia con aria-pressed', () => {
    render(<InboxFilters {...props} messages={todos} />)

    expect(screen.getByRole('button', { name: /Todos/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /Sin leer/ }))
    expect(screen.getByRole('button', { name: /Sin leer/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Todos/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('el contador de sin leer sale en el propio filtro', () => {
    render(<InboxFilters {...props} messages={todos} />)
    expect(screen.getByRole('button', { name: /Sin leer/ })).toHaveTextContent('1')
  })

  it('el contador cuenta todos los sin leer, no solo los visibles', () => {
    const otroSinLeer = mensaje({ responseId: 'd', body: 'Otro sin leer' })
    render(<InboxFilters {...props} messages={[...todos, otroSinLeer]} />)

    fireEvent.click(screen.getByRole('button', { name: /Destacados/ }))
    expect(screen.getByRole('button', { name: /Sin leer/ })).toHaveTextContent('2')
  })

  it('sin mensajes lo dice, en vez de dejar la pantalla en blanco', () => {
    render(<InboxFilters {...props} messages={[]} />)
    expect(screen.getByText(/Todavía no hay mensajes/)).toBeInTheDocument()
  })

  it('un filtro sin resultados también lo dice', () => {
    render(<InboxFilters {...props} messages={[leido]} />)

    fireEvent.click(screen.getByRole('button', { name: /Destacados/ }))
    expect(screen.getByText(/Ningún mensaje/)).toBeInTheDocument()
  })
})

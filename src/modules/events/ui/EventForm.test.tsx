import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Event } from '../domain/event'
import { EventForm } from './EventForm'

vi.mock('../actions', () => ({ createEventAction: vi.fn(), updateEventAction: vi.fn() }))

const evento: Event = {
  id: 'e1',
  userId: 'u1',
  slug: 'boda-ana',
  title: 'Boda de Ana y Luis',
  eventDate: '2026-12-12',
  rsvpDeadline: '2026-11-30',
  locale: 'es',
  themeKey: 'boda-bot',
  status: 'draft',
  retentionDays: 60,
  currency: 'BOB',
  messageTemplate: null,
  venue: null,
}

describe('EventForm y el cambio de modelo', () => {
  it('con el modelo fijo por el plan no ofrece otros y dice por qué', () => {
    const { container } = render(<EventForm diseno={{ fijo: 'Tu plan no incluye cambiar de modelo.' }} event={evento} />)
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(screen.getByText('Tu plan no incluye cambiar de modelo.')).toBeInTheDocument()
    expect(container.querySelector('input[type="hidden"][name="themeKey"]')).toHaveValue('boda-bot')
  })

  it('si el plan lo deja, ofrece los modelos de su fiesta', () => {
    render(<EventForm event={evento} />)
    expect(screen.getAllByRole('radio', { name: /./ }).length).toBeGreaterThan(1)
  })
})

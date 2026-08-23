import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Event } from '../domain/event'
import { EventList } from './EventList'

const evento = (slug: string, title: string): Event => ({
  id: slug,
  slug,
  title,
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
  retentionDays: 90, currency: 'BOB' as const, messageTemplate: null,
})

describe('EventList', () => {
  it('muestra cada evento con su enlace al detalle', () => {
    render(<EventList events={[evento('boda-ana', 'Boda de Ana'), evento('xv-sofia', 'XV de Sofía')]} />)

    expect(screen.getByRole('link', { name: /Boda de Ana/ })).toHaveAttribute('href', '/panel/eventos/boda-ana')
    expect(screen.getByRole('link', { name: /XV de Sofía/ })).toHaveAttribute('href', '/panel/eventos/xv-sofia')
  })

  it('avisa cuando no hay ninguno, en vez de dejar la página muda', () => {
    render(<EventList events={[]} />)
    expect(screen.getByText(/Todavía no hay eventos/)).toBeInTheDocument()
  })
})

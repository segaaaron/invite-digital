import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Event } from '../../domain/event'
import { ClasicoTheme } from './ClasicoTheme'

const evento = (over: Partial<Event> = {}): Event => ({
  id: 'e1',
  userId: null,
  slug: 'boda-demo',
  title: 'Marcia & Ricardo',
  eventDate: '2026-10-18',
  rsvpDeadline: '2026-10-01',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
  retentionDays: 90,
  currency: 'BOB',
  messageTemplate: null,
  venue: null,
  ...over,
})

describe('ClasicoTheme', () => {
  it('dice dónde es cuando el evento tiene lugar', () => {
    render(
      <ClasicoTheme event={evento({ venue: 'Hacienda Los Encinos, Cochabamba' })}>
        <p>contenido</p>
      </ClasicoTheme>,
    )
    // Sin esto la invitación decía cuándo y de quién, pero no dónde.
    expect(screen.getByText('Hacienda Los Encinos, Cochabamba')).toBeInTheDocument()
  })

  it('sin lugar no pinta un hueco vacío', () => {
    const { container } = render(
      <ClasicoTheme event={evento()}>
        <p>contenido</p>
      </ClasicoTheme>,
    )
    expect(container.textContent).not.toContain('null')
  })

  it('la fecha se lee como día de calendario, no como instante', () => {
    render(
      <ClasicoTheme event={evento()}>
        <p>contenido</p>
      </ClasicoTheme>,
    )
    // Sin fijar la zona, un huso al oeste enseñaría el 17.
    expect(screen.getByText(/18 de octubre de 2026/i)).toBeInTheDocument()
  })
})

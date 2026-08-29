import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GuestMessage } from '../domain/inbox'
import { FeaturedMessages } from './FeaturedMessages'

const mensaje = (over: Partial<GuestMessage> = {}): GuestMessage => ({
  responseId: 'r1',
  guestGroupId: 'g1',
  groupLabel: 'Familia Rojas',
  responderName: null,
  body: 'Mensaje corriente',
  writtenAt: new Date('2026-08-20T15:30:00.000Z'),
  readAt: null,
  featuredAt: null,
  reply: null,
  repliedAt: null,
  ...over,
})

const destacado = mensaje({
  responseId: 'c',
  body: 'Mensaje destacado',
  groupLabel: 'Familia Suárez',
  responderName: null,
  featuredAt: new Date('2026-08-21T09:30:00.000Z'),
})

describe('FeaturedMessages', () => {
  it('el cliente ve los mensajes destacados con quién los escribió', () => {
    render(<FeaturedMessages messages={[destacado]} />)

    expect(screen.getByText('Mensaje destacado')).toBeInTheDocument()
    expect(screen.getByText(/Familia Suárez/)).toBeInTheDocument()
  })

  it('NO ve los que no están destacados', () => {
    render(<FeaturedMessages messages={[mensaje(), destacado]} />)

    expect(screen.getByText('Mensaje destacado')).toBeInTheDocument()
    expect(screen.queryByText('Mensaje corriente')).not.toBeInTheDocument()
  })

  it('sin ninguno destacado no pinta nada: ni un hueco vacío', () => {
    const { container } = render(<FeaturedMessages messages={[mensaje()]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('con la lista vacía tampoco pinta nada', () => {
    const { container } = render(<FeaturedMessages messages={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('los ordena del más reciente al más antiguo', () => {
    const viejo = mensaje({
      responseId: 'v',
      body: 'El más viejo',
      featuredAt: new Date('2026-08-21T09:30:00.000Z'),
      writtenAt: new Date('2026-08-10T10:00:00.000Z'),
    })

    render(<FeaturedMessages messages={[viejo, destacado]} />)
    const textos = screen.getAllByRole('article').map((a) => a.textContent ?? '')
    expect(textos[0]).toContain('Mensaje destacado')
    expect(textos[1]).toContain('El más viejo')
  })

  it('la respuesta del atelier no se le enseña al cliente en este bloque', () => {
    // Lo que la pareja quiere releer es lo que escribieron sus invitados, no lo que el
    // atelier contestó desde el panel.
    render(<FeaturedMessages messages={[{ ...destacado, reply: 'Gracias' }]} />)
    expect(screen.queryByText('Gracias')).not.toBeInTheDocument()
  })
})

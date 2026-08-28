import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContentBlockForms } from './ContentBlockForms'

vi.mock('../actions', () => ({
  saveContentBlockAction: vi.fn(),
}))

describe('ContentBlockForms', () => {
  it('enseña un formulario por sección que el diseño pinta', () => {
    render(
      <ContentBlockForms
        content={{ music: { track: 'At Last' } }}
        eventId="e1"
        eventSlug="boda"
        sections={['music', 'itinerary']}
      />,
    )
    expect(screen.getByText('Canción')).toBeInTheDocument()
    expect(screen.getByText('Itinerario')).toBeInTheDocument()
  })

  it('no enseña las secciones que el diseño no pinta', () => {
    // Pedirle un itinerario a un diseño que no lo tiene es pedir trabajo que no se ve.
    render(<ContentBlockForms content={{}} eventId="e1" eventSlug="boda" sections={['music']} />)
    expect(screen.queryByText('Itinerario')).not.toBeInTheDocument()
    expect(screen.queryByText('Código de vestimenta')).not.toBeInTheDocument()
  })

  it('un diseño sin contenido editable lo dice, en vez de dejar la tarjeta vacía', () => {
    render(<ContentBlockForms content={{}} eventId="e1" eventSlug="boda" sections={[]} />)
    expect(screen.getByText(/no lleva contenido editable/i)).toBeInTheDocument()
  })

  it('cada formulario lleva su evento y su sección, para que la acción sepa qué guardar', () => {
    const { container } = render(
      <ContentBlockForms content={{}} eventId="e1" eventSlug="boda-demo" sections={['music']} />,
    )
    expect(container.querySelector('input[name="eventId"]')).toHaveValue('e1')
    expect(container.querySelector('input[name="eventSlug"]')).toHaveValue('boda-demo')
    expect(container.querySelector('input[name="section"]')).toHaveValue('music')
  })

  it('parte del contenido que ya tiene el evento', () => {
    render(<ContentBlockForms content={{ music: { track: 'At Last' } }} eventId="e1" eventSlug="b" sections={['music']} />)
    expect(screen.getByRole('textbox')).toHaveValue(JSON.stringify({ track: 'At Last' }, null, 2))
  })
})

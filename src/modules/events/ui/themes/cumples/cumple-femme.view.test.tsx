import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './cumple-femme.content'
import { CumpleFemmeView } from './cumple-femme.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

afterEach(() => vi.restoreAllMocks())

describe('el tema Femme Fatale', () => {
  it('coloca el RSVP, el libro y los regalos, y no el pase', () => {
    render(<CumpleFemmeView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    for (const ranura of ['ranura-rsvp', 'ranura-regalos', 'ranura-firmas']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
    expect(screen.queryByText('ranura-pase')).not.toBeInTheDocument()
  })

  it('la portada es el cartel, con su llamada, y al tocarla entra', () => {
    render(<CumpleFemmeView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getByText('ENTRA A LA INVITACIÓN')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /abrir/i }))
    expect(screen.queryByText('ENTRA A LA INVITACIÓN')).not.toBeInTheDocument()
  })

  it('pinta la fecha y la hora de lo escrito, no unas de la maqueta', () => {
    render(<CumpleFemmeView {...propsDePrueba({ content: { ...CONTENIDO_DE_MUESTRA, schedule: { startsAt: '2027-03-05T21:30:00' } } })} />)
    expect(screen.getByText('5 · MARZO · 21:30')).toBeInTheDocument()
    expect(screen.getByText('Viernes 5 de marzo')).toBeInTheDocument()
    expect(screen.getByText('21:30')).toBeInTheDocument()
  })

  it('sin foto propia enseña las del diseño; con ella, la del evento', () => {
    const { unmount } = render(<CumpleFemmeView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getByAltText('Tres amigas disfrazadas').getAttribute('src')).toContain('/temas/cumple-femme/amigas-disfraces')
    unmount()
    render(
      <CumpleFemmeView
        {...propsDePrueba({ content: { ...CONTENIDO_DE_MUESTRA, gallery: [{ label: 'Nosotras', imageId: 'abc' }, { label: 'Copas' }] } })}
      />,
    )
    expect(screen.getByAltText('Nosotras')).toHaveAttribute('src', '/media/abc')
  })

  it('las etiquetas de la noche salen del cuarto aviso, una por palabra', () => {
    render(<CumpleFemmeView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getByText('#EntreAmigas')).toBeInTheDocument()
    expect(screen.getByText('#Tentación')).toBeInTheDocument()
  })

  it('quien ya respondió ve su respuesta en vez de los botones', () => {
    render(
      <CumpleFemmeView
        {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA, guestInfo: { label: 'Vania', seats: 1 }, respondida: true, asistira: true })}
      />,
    )
    expect(screen.getByText('¡Te espero, amiga!')).toBeInTheDocument()
    expect(screen.getByText('Vania')).toBeInTheDocument()
    expect(screen.queryByText('ranura-rsvp')).not.toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<CumpleFemmeView {...propsDePrueba({ content: CONTENIDO_DE_MUESTRA })} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<CumpleFemmeView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })
})

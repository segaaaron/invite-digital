import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './boda-cin.content'
import { BodaCinView } from './boda-cin.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

const conMuestra = () => propsDePrueba({ content: CONTENIDO_DE_MUESTRA })

describe('el tema Cinemática', () => {
  it('coloca las cuatro ranuras', () => {
    render(<BodaCinView {...conMuestra()} />)
    for (const ranura of ['ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('compone la fecha de estreno a partir de la hora del evento', () => {
    // El diseño la pinta como «12.12 · 2026», no como una fecha con formato local: es el
    // cartel de un estreno. Sale de `schedule`, así que una boda de verdad enseña la suya.
    render(<BodaCinView {...conMuestra()} />)
    expect(screen.getByText('12.12')).toBeInTheDocument()
    expect(screen.getByText('· 2026 ·')).toBeInTheDocument()
  })

  it('pinta el desglose de escenas con su línea secundaria', () => {
    render(<BodaCinView {...conMuestra()} />)
    expect(screen.getByText('SC.02')).toBeInTheDocument()
    expect(screen.getByText('INT. CAPILLA. NOCHE.')).toBeInTheDocument()
    expect(screen.getByText('Ceremonia · 19:00')).toBeInTheDocument()
  })

  it('la escena de cierre no inventa una línea secundaria', () => {
    render(<BodaCinView {...conMuestra()} />)
    expect(screen.getByText('FADE TO BLACK')).toBeInTheDocument()
  })

  it('parte los créditos por sus saltos de línea', () => {
    render(<BodaCinView {...conMuestra()} />)
    expect(screen.getByText('Casting · destino')).toBeInTheDocument()
    expect(screen.getByText('fin.')).toBeInTheDocument()
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<BodaCinView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<BodaCinView {...conMuestra()} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

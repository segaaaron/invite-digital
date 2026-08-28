import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from '../kit/test-helpers'
import { propsDePrueba } from '../test-props'
import { CONTENIDO_DE_MUESTRA } from './boda-bot.content'
import { BodaBotView } from './boda-bot.view'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

const conMuestra = () => propsDePrueba({ content: CONTENIDO_DE_MUESTRA })

describe('el tema Botánica', () => {
  it('coloca las cuatro ranuras', () => {
    render(<BodaBotView {...conMuestra()} />)
    for (const ranura of ['ranura-rsvp', 'ranura-regalos', 'ranura-firmas', 'ranura-pase']) {
      expect(screen.getByText(ranura), ranura).toBeInTheDocument()
    }
  })

  it('compone la fecha en piezas, como una hoja de calendario', () => {
    // El diseño la pinta en cuatro partes —día de la semana, mes, número grande, año—, no
    // como una línea de texto. Se calcula de la hora del evento y no se copia: la maqueta
    // tenía «SÁBADO» escrito a mano sobre un 18 de octubre de 2026 que cae en **domingo**.
    // Copiarlo habría heredado el error en todas las bodas que usen este diseño.
    render(<BodaBotView {...conMuestra()} />)
    expect(screen.getByText(/domingo/i)).toBeInTheDocument()
    expect(screen.getByText(/octubre/i)).toBeInTheDocument()
    // El «18» aparece dos veces: el día del calendario y las horas de la cuenta atrás. Se
    // busca el del calendario por su tamaño, que es lo que lo distingue en el diseño.
    const dias = screen.getAllByText('18')
    expect(dias.some((nodo) => nodo.style.fontSize === '90px')).toBe(true)
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it('pinta el itinerario con sus seis hitos', () => {
    render(<BodaBotView {...conMuestra()} />)
    for (const fila of CONTENIDO_DE_MUESTRA.itinerary ?? []) {
      expect(screen.getByText(fila.label), fila.label).toBeInTheDocument()
    }
  })

  it('parte la frase por sus saltos de línea, como el diseño la compone', () => {
    render(<BodaBotView {...conMuestra()} />)
    expect(screen.getByText('and they lived')).toBeInTheDocument()
    expect(screen.getByText('happily ever after')).toBeInTheDocument()
  })

  it('sin contenido no revienta ni escribe «undefined»', () => {
    const { container } = render(<BodaBotView {...propsDePrueba({ content: {} })} />)
    expect(container.textContent).not.toContain('undefined')
    expect(screen.getByText('ranura-rsvp')).toBeInTheDocument()
  })

  it('emite un solo encabezado de nivel 1', () => {
    render(<BodaBotView {...conMuestra()} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

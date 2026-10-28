import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeatViewToggle } from './SeatViewToggle'

// jsdom no aplica media queries: el enlace también lee «Lista de mesas», el texto del celular.
const MAPA = /^Vista de mapa/

const base = '/dashboard/events/boda/tables'

describe('SeatViewToggle', () => {
  it('el plano es la vista de partida, como en la maqueta', () => {
    render(<SeatViewToggle base={base} current="mapa" />)
    expect(screen.getByRole('link', { name: MAPA })).toHaveAttribute('aria-current', 'page')
  })

  it('cada vista es un enlace, así que sobrevive al guardado de una mesa', () => {
    render(<SeatViewToggle base={base} current="mapa" />)
    expect(screen.getByRole('link', { name: 'Vista de tarjetas' }).getAttribute('href')).toBe(`${base}?vista=tarjetas`)
    expect(screen.getByRole('link', { name: MAPA }).getAttribute('href')).toBe(base)
  })

  it('marca la vista abierta para quien no distingue el contraste', () => {
    render(<SeatViewToggle base={base} current="tarjetas" />)
    expect(screen.getByRole('link', { name: 'Vista de tarjetas' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: MAPA })).not.toHaveAttribute('aria-current')
  })
})

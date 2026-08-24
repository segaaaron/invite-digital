import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { eventStatsOf } from '../domain/stats'
import { EventStats } from './EventStats'

const stats = (rows: Array<{ seats: number; attending: number | null }>) => eventStatsOf(rows)

const CUATRO = [
  { seats: 4, attending: 3 },
  { seats: 2, attending: 2 },
  { seats: 3, attending: 0 },
  { seats: 1, attending: null },
]

describe('EventStats', () => {
  it('pinta el embudo con invitados, respondieron y confirmaron', () => {
    render(<EventStats stats={stats(CUATRO)} />)

    expect(screen.getByText(/^4$/)).toBeInTheDocument()
    expect(screen.getByText(/grupos invitados/i)).toBeInTheDocument()
    expect(screen.getByText(/respondieron/i)).toBeInTheDocument()
    expect(screen.getByText(/confirmaron/i)).toBeInTheDocument()
  })

  it('dice los cupos confirmados sobre los invitados', () => {
    render(<EventStats stats={stats(CUATRO)} />)
    expect(screen.getByText('5 de 10')).toBeInTheDocument()
  })

  it('es el embudo de la maqueta: invitados, respondieron y confirmaron', () => {
    render(<EventStats stats={stats(CUATRO)} />)

    expect(screen.getByText('Grupos invitados')).toBeInTheDocument()
    expect(screen.getByText('Respondieron')).toBeInTheDocument()
    expect(screen.getByText('Confirmaron')).toBeInTheDocument()
  })

  it('no repite el desglose del donut que tiene al lado', () => {
    render(<EventStats stats={stats(CUATRO)} />)
    expect(screen.queryByText(/^no asisten$/i)).not.toBeInTheDocument()
  })

  it('ninguna cifra del embudo sale como NaN', () => {
    render(<EventStats stats={stats(CUATRO)} />)
    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument()
  })

  it('sin invitados lo dice en vez de pintar ceros y porcentajes', () => {
    render(<EventStats stats={stats([])} />)

    expect(screen.getByText(/todavía no hay invitados/i)).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument()
  })

  it('no inventa métricas: ni dispositivos ni fuentes de tráfico, que no se miden', () => {
    // La maqueta las prometía. Pintarlas con datos plausibles sería mentir en un panel
    // que alguien va a usar para decidir a quién llamar.
    render(<EventStats stats={stats(CUATRO)} />)

    expect(screen.queryByText(/dispositiv/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/tráfico/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/móvil|escritorio/i)).not.toBeInTheDocument()
  })

  it('con todos pendientes el embudo se estrecha a cero sin romperse', () => {
    render(<EventStats stats={stats([{ seats: 2, attending: null }])} />)
    expect(screen.getByText('Respondieron')).toBeInTheDocument()
    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument()
  })

  it('sin cupos declarados no pinta el porcentaje de cupos: no hay contra qué medirlo', () => {
    render(<EventStats stats={stats([{ seats: 0, attending: null }])} />)
    expect(screen.getByText('0 de 0')).toBeInTheDocument()
    expect(screen.queryByTestId('cupos-porcentaje')).not.toBeInTheDocument()
  })
})

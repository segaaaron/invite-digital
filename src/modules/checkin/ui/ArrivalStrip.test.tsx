import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DoorTally } from '../domain/door-tally'
import { ArrivalStrip } from './ArrivalStrip'

const tally = (over: Partial<DoorTally> = {}): DoorTally => ({
  expectedGroups: 12,
  arrivedGroups: 5,
  expectedHeads: 40,
  headsInside: 17,
  unexpectedGroups: 0,
  ...over,
})

describe('ArrivalStrip', () => {
  it('dice cuántos grupos de cuántos han llegado', () => {
    render(<ArrivalStrip tally={tally()} />)
    expect(screen.getByText('5 de 12')).toBeInTheDocument()
    expect(screen.getByText(/invitaciones que llegaron/i)).toBeInTheDocument()
  })

  it('dice cuántas personas hay dentro frente a las esperadas', () => {
    render(<ArrivalStrip tally={tally()} />)
    expect(screen.getByText('17 de 40')).toBeInTheDocument()
    expect(screen.getByText(/personas dentro/i)).toBeInTheDocument()
  })

  it('sin ninguna llegada muestra el estado inicial, no un hueco vacío', () => {
    render(<ArrivalStrip tally={tally({ arrivedGroups: 0, headsInside: 0 })} />)
    expect(screen.getByText('0 de 12')).toBeInTheDocument()
    expect(screen.getByText('0 de 40')).toBeInTheDocument()
    expect(screen.getByText(/todavía no ha llegado nadie/i)).toBeInTheDocument()
  })

  it('cuenta aparte a los que entraron sin estar entre los esperados', () => {
    // Aparece gente que había dicho que no, y su pase es válido. Sumarla en silencio a
    // los esperados escondería que el salón tiene más gente de la prevista.
    render(<ArrivalStrip tally={tally({ unexpectedGroups: 2 })} />)
    expect(screen.getByText(/2 invitaciones llegaron sin estar entre las esperadas/i)).toBeInTheDocument()
  })

  it('sin inesperados no pinta esa línea', () => {
    render(<ArrivalStrip tally={tally()} />)
    expect(screen.queryByText(/sin estar entre los esperados/i)).not.toBeInTheDocument()
  })

  it('un solo grupo inesperado se dice en singular', () => {
    render(<ArrivalStrip tally={tally({ unexpectedGroups: 1 })} />)
    expect(screen.getByText(/1 invitación llegó sin estar entre las esperadas/i)).toBeInTheDocument()
  })

  it('sin datos de puerta —el plan no la incluye— la tira no existe', () => {
    const { container } = render(<ArrivalStrip tally={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})

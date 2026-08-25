import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SeatSearch } from './SeatSearch'

const grupo = (id: string, label: string) => ({
  id,
  label,
  seats: 2,
  tableId: null,
  eventId: 'e1',
  revoked: false,
  confirmed: 2,
})

const mesa = {
  id: 't1',
  eventId: 'e1',
  label: 'Mesa 01',
  capacity: 8,
  shape: 'round' as const,
  x: 50,
  y: 50,
  taken: 4,
  free: 4,
  groups: [{ ...grupo('g1', 'Familia Rojas Peña'), tableId: 't1' }],
}

describe('SeatSearch', () => {
  it('dice en qué mesa se sienta un grupo', () => {
    render(<SeatSearch tables={[mesa]} unseated={[]} />)
    fireEvent.change(screen.getByLabelText('Buscar grupo'), { target: { value: 'rojas' } })
    expect(screen.getByRole('status')).toHaveTextContent('Mesa 01')
  })

  it('avisa cuando el grupo aún no tiene mesa', () => {
    render(<SeatSearch tables={[mesa]} unseated={[grupo('g2', 'Camila Vargas')]} />)
    fireEvent.change(screen.getByLabelText('Buscar grupo'), { target: { value: 'camila' } })
    expect(screen.getByRole('status')).toHaveTextContent(/sin mesa/i)
  })

  it('avisa cuando no encuentra a nadie con ese nombre', () => {
    render(<SeatSearch tables={[mesa]} unseated={[]} />)
    fireEvent.change(screen.getByLabelText('Buscar grupo'), { target: { value: 'zulema' } })
    expect(screen.getByRole('status')).toHaveTextContent(/no encontramos/i)
  })

  it('sin escribir nada no dice nada', () => {
    render(<SeatSearch tables={[mesa]} unseated={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('')
  })
})

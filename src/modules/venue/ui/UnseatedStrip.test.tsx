import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SeatedGroupRow } from '../application/ports'
import { UnseatedStrip } from './UnseatedStrip'

const grupo = (id: string, label: string, seats: number): SeatedGroupRow => ({
  id,
  eventId: 'e1',
  label,
  seats,
  tableId: null,
  revoked: false,
  confirmed: seats,
})

describe('UnseatedStrip', () => {
  it('lista los grupos pendientes de sentar con sus cupos', () => {
    render(<UnseatedStrip groups={[grupo('a', 'Familia Rojas', 4), grupo('b', 'Camila Vargas', 1)]} />)
    expect(screen.getByText('Familia Rojas')).toBeInTheDocument()
    expect(screen.getByText(/4 cupos/)).toBeInTheDocument()
    expect(screen.getByText(/1 cupo$/)).toBeInTheDocument()
  })

  it('dice cuántos quedan sin mesa', () => {
    render(<UnseatedStrip groups={[grupo('a', 'Familia Rojas', 4), grupo('b', 'Camila Vargas', 1)]} />)
    expect(screen.getByRole('region', { name: /sin mesa/i })).toHaveTextContent('2')
  })

  it('desaparece cuando no queda ninguno: una tira vacía es ruido', () => {
    const { container } = render(<UnseatedStrip groups={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

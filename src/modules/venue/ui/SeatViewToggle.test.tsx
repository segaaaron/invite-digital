import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SeatViewToggle } from './SeatViewToggle'

describe('SeatViewToggle', () => {
  it('arranca en el plano y lo declara con aria-pressed', () => {
    render(
      <SeatViewToggle cards={<p>tarjetas</p>} map={<p>plano</p>} />,
    )
    expect(screen.getByRole('button', { name: /vista de mapa/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('plano')).toBeInTheDocument()
    expect(screen.queryByText('tarjetas')).not.toBeInTheDocument()
  })

  it('cambia a tarjetas y vuelve', () => {
    render(<SeatViewToggle cards={<p>tarjetas</p>} map={<p>plano</p>} />)

    fireEvent.click(screen.getByRole('button', { name: /vista de tarjetas/i }))
    expect(screen.getByText('tarjetas')).toBeInTheDocument()
    expect(screen.queryByText('plano')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /vista de mapa/i }))
    expect(screen.getByText('plano')).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { GuestGroupTable, type GuestGroupRowView } from './GuestGroupTable'

const groups: GuestGroupRowView[] = [
  { id: 'g1', label: 'Familia Rojas Peña', seats: 4, revokedAt: null, confirmed: 4 },
  { id: 'g2', label: 'Ana Lucía Vega', seats: 2, revokedAt: null, confirmed: null },
  { id: 'g3', label: 'Roberto Núñez', seats: 1, revokedAt: null, confirmed: 0 },
  { id: 'g4', label: 'Zulema Castro', seats: 3, revokedAt: new Date('2026-08-01'), confirmed: null },
]

describe('GuestGroupTable', () => {
  it('sin invitados lo dice', () => {
    render(<GuestGroupTable eventSlug="boda" groups={[]} />)
    expect(screen.getByText(/todavía no hay invitados/i)).toBeInTheDocument()
  })

  it('filtra por estado y el contador de cada filtro sale de todos, no de lo visible', () => {
    render(<GuestGroupTable eventSlug="boda" groups={groups} />)
    expect(screen.getByRole('button', { name: /confirmados 1/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /pendientes/i }))
    expect(screen.getByText('Ana Lucía Vega')).toBeInTheDocument()
    expect(screen.queryByText('Familia Rojas Peña')).not.toBeInTheDocument()
    // El contador sigue contando sobre el total aunque la tabla enseñe una fila.
    expect(screen.getByRole('button', { name: /confirmados 1/i })).toBeInTheDocument()
  })

  it('«no vienen» es quien respondió cero, no quien no respondió', () => {
    render(<GuestGroupTable eventSlug="boda" groups={groups} />)
    fireEvent.click(screen.getByRole('button', { name: /no vienen/i }))
    expect(screen.getByText('Roberto Núñez')).toBeInTheDocument()
    expect(screen.queryByText('Ana Lucía Vega')).not.toBeInTheDocument()
  })

  it('busca por etiqueta y dice cuándo no queda nada', () => {
    render(<GuestGroupTable eventSlug="boda" groups={groups} />)
    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'rojas' } })
    expect(screen.getByText('Familia Rojas Peña')).toBeInTheDocument()
    expect(screen.queryByText('Roberto Núñez')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/buscar/i), { target: { value: 'nadie' } })
    expect(screen.getByText(/ningún grupo coincide/i)).toBeInTheDocument()
  })

  it('el estado se lee como texto, no solo por color', () => {
    render(<GuestGroupTable eventSlug="boda" groups={groups} />)
    expect(screen.getByText('Revocada')).toBeInTheDocument()
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
  })
})

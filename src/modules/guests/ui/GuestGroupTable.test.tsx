import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GuestGroupTable, type GuestGroupRowView } from './GuestGroupTable'

vi.mock('../actions', () => ({ revokeInvitationAction: vi.fn() }))

const filas: GuestGroupRowView[] = [
  { id: 'g1', label: 'Familia Rojas', seats: 4, revokedAt: null, confirmed: 3 },
  { id: 'g2', label: 'Camila Vargas', seats: 1, revokedAt: new Date('2026-08-01T00:00:00Z'), confirmed: null },
  { id: 'g3', label: 'Daniela Ortiz', seats: 2, revokedAt: null, confirmed: null },
]

describe('GuestGroupTable', () => {
  it('muestra los cupos confirmados sobre los asignados', () => {
    render(<GuestGroupTable eventSlug="boda" groups={filas} />)
    expect(screen.getByText('3 / 4')).toBeInTheDocument()
    expect(screen.getByText('— / 2')).toBeInTheDocument()
  })

  it('distingue pendiente, confirmada y revocada', () => {
    render(<GuestGroupTable eventSlug="boda" groups={filas} />)
    expect(screen.getByText('Confirmada')).toBeInTheDocument()
    expect(screen.getByText('Revocada')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('no ofrece revocar lo ya revocado', () => {
    render(<GuestGroupTable eventSlug="boda" groups={filas} />)
    expect(screen.getAllByRole('button', { name: 'Revocar' })).toHaveLength(2)
  })

  it('no muestra el enlace de invitación: solo existía al crearlo', () => {
    render(<GuestGroupTable eventSlug="boda" groups={filas} />)
    expect(screen.queryByRole('button', { name: /copiar enlace/i })).not.toBeInTheDocument()
  })

  it('avisa cuando el evento no tiene invitados', () => {
    render(<GuestGroupTable eventSlug="boda" groups={[]} />)
    expect(screen.getByText(/Todavía no hay invitados/)).toBeInTheDocument()
  })
})

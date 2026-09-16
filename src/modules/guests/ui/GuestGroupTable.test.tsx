import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { GuestGroupTable, type GuestGroupRowView } from './GuestGroupTable'

vi.mock('@/app/_acciones/guests/actions', async (original) => ({
  // Mock parcial: `RevokeInvitationForm` usa la acción de revocar de verdad.
  ...(await original<typeof import('@/app/_acciones/guests/actions')>()),
  markInvitationSentAction: vi.fn(async () => ({ status: 'success' as const })),
}))

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

  it('la columna «Su enlace» dice si ya se repartió, y lleva a prepararlo', () => {
    // Es una marca del atelier, no una prueba de entrega: ni WhatsApp ni el correo
    // avisan de vuelta, y llamarlo «entregado» sería afirmar lo que nadie comprobó.
    render(
      <GuestGroupTable
        eventSlug="boda"
        groups={[{ ...groups[0]!, invitationSentAt: new Date('2026-08-20') }, groups[1]!]}
      />,
    )
    expect(screen.getByRole('button', { name: 'Repartido' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /preparar y enviar|volver a enviar/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Sin repartir' }).length).toBeGreaterThan(0)
  })

  it('el estado se lee como texto, no solo por color', () => {
    render(<GuestGroupTable eventSlug="boda" groups={groups} />)
    expect(screen.getByText('Revocada')).toBeInTheDocument()
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
  })
})

describe('GuestGroupTable · el estado dice lo que pasó', () => {
  it('un grupo que respondió cero no se llama «Confirmada»', () => {
    render(
      <GuestGroupTable
        eventSlug="boda"
        groups={[
          {
            id: 'g9',
            label: 'Sergio Aldama y señora',
            seats: 2,
            confirmed: 0,
            revokedAt: null,
            invitationSentAt: null,
            phone: null,
          },
        ]}
      />,
    )
    expect(screen.getByText('No vienen')).toBeInTheDocument()
    expect(screen.queryByText('Confirmada')).not.toBeInTheDocument()
  })
})

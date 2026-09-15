import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DangerZone } from './DangerZone'

vi.mock('@/app/_acciones/events/actions', () => ({ deleteEventAction: vi.fn(async () => ({ status: 'idle' as const })) }))

describe('DangerZone', () => {
  it('el botón está apagado hasta que se escribe el identificador exacto', () => {
    // Borrar se lleva invitados, mesas, regalos y mensajes, y no hay papelera. Un botón
    // que borra una boda con un clic acaba borrando una boda con un clic.
    render(<DangerZone eventId="e1" eventSlug="boda-marcia-ricardo" />)

    const boton = screen.getByRole('button', { name: 'Eliminar evento' })
    expect(boton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/escribe/i), { target: { value: 'boda' } })
    expect(boton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/escribe/i), { target: { value: 'boda-marcia-ricardo' } })
    expect(boton).toBeEnabled()
  })

  it('dice qué se lleva por delante, antes de que nadie lo pulse', () => {
    render(<DangerZone eventId="e1" eventSlug="boda" />)
    expect(screen.getByText(/invitados, mesas, regalos, mensajes y visitas/i)).toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DangerZone } from './DangerZone'

vi.mock('@/app/_acciones/events/actions', () => ({ deleteEventAction: vi.fn(async () => ({ status: 'idle' as const })) }))

describe('DangerZone', () => {
  it('no deja borrar hasta escribir el nombre del evento', () => {
    // Borrar se lleva invitados, mesas, regalos y mensajes, y no hay papelera.
    render(<DangerZone eventId="e1" titulo="Boda de María y Alejandro" />)

    const boton = screen.getByRole('button', { name: 'Borrar para siempre', hidden: true })
    expect(boton).toBeDisabled()
    const campo = screen.getByLabelText(/escribe el nombre del evento/i)
    fireEvent.change(campo, { target: { value: 'Boda' } })
    expect(boton).toBeDisabled()
    fireEvent.change(campo, { target: { value: 'boda de maría y alejandro' } })
    expect(boton).toBeEnabled()
  })
})

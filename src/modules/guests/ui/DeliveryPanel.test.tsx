import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DeliveryPanel } from './DeliveryPanel'

const guardarTelefono = vi.hoisted(() => vi.fn())
vi.mock('../actions', () => ({
  resendInvitationAction: vi.fn(async () => ({ status: 'idle' as const })),
  setGroupPhoneAction: guardarTelefono,
}))

const filas = [
  { id: 'g1', label: 'Familia Rojas Peña', phone: null, sent: false, revoked: false },
  { id: 'g2', label: 'Familia Rojas Peña', phone: '+59170022233', sent: true, revoked: false },
]

describe('DeliveryPanel', () => {
  it('si el teléfono no se guarda, lo dice: WhatsApp abriría sin destinatario', async () => {
    guardarTelefono.mockImplementation(async () => ({ status: 'error', message: 'No se pudo guardar el teléfono.' }))
    render(<DeliveryPanel eventLocale="es" eventSlug="boda" rows={filas} template={null} />)

    // Dos grupos con la misma etiqueta: pasa constantemente —«Familia Rojas Peña» dos
    // veces— y por eso nada puede identificarse por su nombre en esta pantalla.
    const campo = screen.getAllByLabelText(/teléfono de/i)[0]!
    fireEvent.change(campo, { target: { value: '+59170011122' } })
    fireEvent.blur(campo)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo guardar el teléfono/i))
  })
})

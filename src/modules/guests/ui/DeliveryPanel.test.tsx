import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ResendState } from '../actions'
import { DeliveryPanel } from './DeliveryPanel'

const guardarTelefono = vi.hoisted(() => vi.fn())
const reenviar = vi.hoisted(() => vi.fn<() => Promise<ResendState>>(async () => ({ status: 'idle' })))
vi.mock('../actions', () => ({
  resendInvitationAction: reenviar,
  setGroupPhoneAction: guardarTelefono,
}))

const filas = [
  { id: 'g1', label: 'Familia Rojas Peña', phone: null, sent: false, revoked: false },
  { id: 'g2', label: 'Familia Rojas Peña', phone: '+59170022233', sent: true, revoked: false },
]

describe('DeliveryPanel', () => {
  it('si el teléfono no se guarda, lo dice: WhatsApp abriría sin destinatario', async () => {
    guardarTelefono.mockImplementation(async () => ({ status: 'error', message: 'No se pudo guardar el teléfono.' }))
    render(<DeliveryPanel eventLocale="es" eventSlug="boda" eventTitle="María & Alejandro" rows={filas} template={null} />)

    // Dos grupos con la misma etiqueta: pasa constantemente —«Familia Rojas Peña» dos
    // veces— y por eso nada puede identificarse por su nombre en esta pantalla.
    const campo = screen.getAllByLabelText(/teléfono de/i)[0]!
    fireEvent.change(campo, { target: { value: '+59170011122' } })
    fireEvent.blur(campo)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo guardar el teléfono/i))
  })

  it('el enlace nuevo trae su tarjeta con QR, que es la única ocasión de imprimirla', async () => {
    reenviar.mockImplementation(async () => ({
      status: 'success',
      groupId: 'g1',
      label: 'Familia Rojas Peña',
      url: 'https://invitepremium.bo/i/TOKEN',
    }))
    render(<DeliveryPanel eventLocale="es" eventSlug="boda" eventTitle="María & Alejandro" rows={filas} template={null} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Generar enlace' })[0]!)

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Invitación de Familia Rojas Peña' })).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /imprimir hoja de reparto/i })).toBeInTheDocument()
  })
})

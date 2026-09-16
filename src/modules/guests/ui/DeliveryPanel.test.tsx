import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ResendState } from '@/app/_acciones/guests/actions'
import { DeliveryPanel } from './DeliveryPanel'

const guardarTelefono = vi.hoisted(() => vi.fn())
const reenviar = vi.hoisted(() => vi.fn<() => Promise<ResendState>>(async () => ({ status: 'idle' })))
vi.mock('@/app/_acciones/guests/actions', () => ({
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
    render(<DeliveryPanel sinContenido={false} eventLocale="es" eventSlug="boda" eventTitle="María & Alejandro" rows={filas} template={null} />)

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
    render(<DeliveryPanel sinContenido={false} eventLocale="es" eventSlug="boda" eventTitle="María & Alejandro" rows={filas} template={null} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Preparar enlace' })[0]!)

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Invitación de Familia Rojas Peña' })).toBeInTheDocument(),
    )
    // La tarjeta va plegada: casi todo se reparte por WhatsApp.
    fireEvent.click(screen.getByText(/tarjeta con qr para imprimir/i))
    expect(screen.getByRole('button', { name: /imprimir hoja de reparto/i })).toBeInTheDocument()
    // Y el mensaje se copia **con el enlace dentro**, que es lo único que sirve para pegarlo.
    expect(screen.getByRole('button', { name: 'Copiar mensaje' })).toBeInTheDocument()
  })

  it('con la invitación terminada reparte aunque el evento no esté publicado: preparar el enlace la publica', () => {
    render(<DeliveryPanel sinContenido={false} eventLocale="es" eventSlug="boda" eventTitle="María & Alejandro" rows={filas} template={null} />)

    expect(screen.queryByText(/borrador/i)).toBeNull()
    for (const boton of screen.getAllByRole('button', { name: /preparar/i })) expect(boton).toBeEnabled()
  })

  it('con la invitación sin terminar no reparte, y dice por qué', () => {
    render(<DeliveryPanel sinContenido eventLocale="es" eventSlug="boda" eventTitle="María & Alejandro" rows={filas} template={null} />)

    expect(screen.getByRole('alert')).toHaveTextContent(/sin terminar/i)
    for (const boton of screen.getAllByRole('button', { name: /preparar/i })) expect(boton).toBeDisabled()
  })

})

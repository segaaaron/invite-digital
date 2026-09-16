import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ResendState } from '@/app/_acciones/guests/actions'
import { DeliveryPanel } from './DeliveryPanel'

const guardarTelefono = vi.hoisted(() => vi.fn())
const reenviar = vi.hoisted(() => vi.fn<(previo: ResendState, datos: FormData) => Promise<ResendState>>(async () => ({ status: 'idle' })))
const replace = vi.hoisted(() => vi.fn())
vi.mock('@/app/_acciones/guests/actions', () => ({
  resendInvitationAction: reenviar,
  setGroupPhoneAction: guardarTelefono,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

const filas = [
  { id: 'g1', label: 'Yasmin Medrano Avila', phone: '+59177205448', sent: false, revoked: false, confirmed: null },
  { id: 'g2', label: 'Carlos Rojas', phone: null, sent: true, revoked: false, confirmed: 1 },
  { id: 'g3', label: 'Luis Peña', phone: null, sent: true, revoked: false, confirmed: null },
]

const pinta = (over: Partial<Parameters<typeof DeliveryPanel>[0]> = {}) =>
  render(
    <DeliveryPanel
      closeHref="/panel/eventos/boda/invitados"
      eventLocale="es"
      eventSlug="boda"
      eventTitle="Quince de Camila"
      rows={filas}
      sinContenido={false}
      template={null}
      {...over}
    />,
  )

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom no implementa `showModal`: el doble marca el diálogo como abierto, como el navegador.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})

describe('DeliveryPanel', () => {
  it('es un panel lateral con el progreso del reparto y dos pestañas', () => {
    pinta()

    expect(screen.getByRole('dialog', { name: 'Enviar invitaciones' })).toBeInTheDocument()
    expect(screen.getByText('2 de 3 enviadas')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Por enviar (1)' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Enviadas (2)' })).toBeInTheDocument()
    // Por enviar enseña solo a quien falta.
    expect(screen.getByText('Yasmin Medrano Avila')).toBeInTheDocument()
    expect(screen.queryByText('Carlos Rojas')).not.toBeInTheDocument()
  })

  it('«Enviar por WhatsApp» prepara el enlace y abre WhatsApp con el mensaje ya escrito, en un solo toque', async () => {
    const ventana = { location: { href: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(ventana as unknown as Window)
    reenviar.mockResolvedValue({ status: 'success', groupId: 'g1', label: 'Yasmin Medrano Avila', url: 'https://luxuryatelier.net/i/TOKEN' })
    pinta()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp a Yasmin Medrano Avila' }))

    await waitFor(() => expect(ventana.location.href).toContain('https://wa.me/59177205448?text='))
    expect(decodeURIComponent(ventana.location.href)).toContain('https://luxuryatelier.net/i/TOKEN')
    // El enlace se enseña una vez, junto a quien se le mandó, con la tarjeta QR por si se entrega en mano.
    const fila = screen.getByRole('listitem', { name: 'Yasmin Medrano Avila' })
    expect(within(fila).getByLabelText('Enlace de la invitación')).toHaveValue('https://luxuryatelier.net/i/TOKEN')
  })

  it('si el enlace no se prepara, cierra la ventana que abrió y dice por qué', async () => {
    const ventana = { location: { href: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(ventana as unknown as Window)
    reenviar.mockResolvedValue({ status: 'error', message: 'Antes de invitar, termina tu invitación.' })
    pinta()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp a Yasmin Medrano Avila' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('termina tu invitación')
    expect(ventana.close).toHaveBeenCalled()
  })

  it('en «Enviadas» se ve si confirmó, y reenviar avisa de que anula el enlace anterior', () => {
    pinta()
    fireEvent.click(screen.getByRole('tab', { name: 'Enviadas (2)' }))

    expect(within(screen.getByRole('listitem', { name: 'Carlos Rojas' })).getByText('Confirmó')).toBeInTheDocument()
    expect(within(screen.getByRole('listitem', { name: 'Luis Peña' })).getByText('Sin responder')).toBeInTheDocument()
    expect(screen.getByText(/anula el anterior/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reenviar a Luis Peña' })).toBeInTheDocument()
  })

  it('si el teléfono no se guarda, lo dice: WhatsApp abriría sin destinatario', async () => {
    guardarTelefono.mockImplementation(async () => ({ status: 'error', message: 'No se pudo guardar el teléfono.' }))
    pinta()

    const campo = screen.getByLabelText('Teléfono de Yasmin Medrano Avila')
    fireEvent.change(campo, { target: { value: '70011122' } })
    fireEvent.blur(campo)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo guardar el teléfono/i))
  })

  it('con la invitación sin terminar no reparte, y dice por qué', () => {
    pinta({ sinContenido: true })

    expect(screen.getByRole('alert')).toHaveTextContent(/sin terminar/i)
    expect(screen.getByRole('button', { name: 'Enviar por WhatsApp a Yasmin Medrano Avila' })).toBeDisabled()
  })

  it('cerrar vuelve a la lista sin el parámetro', () => {
    pinta()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(replace).toHaveBeenCalledWith('/panel/eventos/boda/invitados')
  })
})

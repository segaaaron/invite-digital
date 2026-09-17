import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ResendState } from '@/app/_acciones/guests/actions'
import { DeliveryPanel } from './DeliveryPanel'

const guardarTelefono = vi.hoisted(() => vi.fn())
const reenviar = vi.hoisted(() => vi.fn<(previo: ResendState, datos: FormData) => Promise<ResendState>>(async () => ({ status: 'idle' })))
const enviar = vi.hoisted(() => vi.fn<(previo: ResendState, datos: FormData) => Promise<ResendState>>(async () => ({ status: 'idle' })))
const replace = vi.hoisted(() => vi.fn())
vi.mock('@/app/_acciones/guests/actions', () => ({
  resendInvitationAction: reenviar,
  sendInvitationAction: enviar,
  setGroupPhoneAction: guardarTelefono,
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

const filas = [
  { id: 'g1', label: 'Yasmin Medrano Avila', phone: '+59177205448', sent: false, revoked: false, confirmed: null },
  { id: 'g2', label: 'Carlos Rojas', phone: null, sent: true, revoked: false, confirmed: 1, url: 'https://luxuryatelier.net/i/CARLOS', email: 'carlos@correo.bo' },
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
  it('es un modal con el progreso del reparto y dos pestañas', () => {
    pinta()

    expect(screen.getByRole('dialog', { name: 'Enviar invitaciones' })).toBeInTheDocument()
    expect(screen.getByText('2 de 3 enviadas')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Por enviar (1)' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Enviadas (2)' })).toBeInTheDocument()
    // Por enviar enseña solo a quien falta.
    expect(screen.getByText('Yasmin Medrano Avila')).toBeInTheDocument()
    expect(screen.queryByText('Carlos Rojas')).not.toBeInTheDocument()
  })

  it('sin enlace guardado, WhatsApp lo prepara sin cambiarlo y abre el chat con el mensaje, en un solo toque', async () => {
    const ventana = { location: { href: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(ventana as unknown as Window)
    enviar.mockResolvedValue({ status: 'success', groupId: 'g1', label: 'Yasmin Medrano Avila', url: 'https://luxuryatelier.net/i/TOKEN' })
    pinta()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp a Yasmin Medrano Avila' }))

    await waitFor(() => expect(ventana.location.href).toContain('https://wa.me/59177205448?text='))
    expect(decodeURIComponent(ventana.location.href)).toContain('https://luxuryatelier.net/i/TOKEN')
    expect(reenviar).not.toHaveBeenCalled()
  })

  it('si el enlace no se prepara, cierra la ventana que abrió y dice por qué', async () => {
    const ventana = { location: { href: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(ventana as unknown as Window)
    enviar.mockResolvedValue({ status: 'error', message: 'Antes de invitar, termina tu invitación.' })
    pinta()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp a Yasmin Medrano Avila' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('termina tu invitación')
    expect(ventana.close).toHaveBeenCalled()
  })

  it('en «Enviadas» se ve si confirmó, y su enlace de siempre sale para mandarlo por correo, SMS o donde sea', () => {
    pinta()
    fireEvent.click(screen.getByRole('tab', { name: 'Enviadas (2)' }))

    const carlos = screen.getByRole('listitem', { name: 'Carlos Rojas' })
    expect(within(carlos).getByText('Confirmó')).toBeInTheDocument()
    expect(within(screen.getByRole('listitem', { name: 'Luis Peña' })).getByText('Sin responder')).toBeInTheDocument()

    fireEvent.click(within(carlos).getByRole('button', { name: /Enlace y otras formas/ }))
    expect(within(carlos).getByLabelText('Enlace de la invitación de Carlos Rojas')).toHaveValue('https://luxuryatelier.net/i/CARLOS')
    expect(within(carlos).getByRole('link', { name: /Correo/ }).getAttribute('href')).toMatch(/^mailto:carlos%40correo\.bo\?subject=/)
    expect(within(carlos).getByRole('link', { name: /SMS/ }).getAttribute('href')).toContain('CARLOS')
    // Ya tenía enlace: no se pidió nada al servidor.
    expect(enviar).not.toHaveBeenCalled()
  })

  it('generar un enlace nuevo se confirma antes, porque anula el anterior', async () => {
    reenviar.mockResolvedValue({ status: 'success', groupId: 'g2', label: 'Carlos Rojas', url: 'https://luxuryatelier.net/i/NUEVO' })
    pinta()
    fireEvent.click(screen.getByRole('tab', { name: 'Enviadas (2)' }))
    const carlos = screen.getByRole('listitem', { name: 'Carlos Rojas' })
    fireEvent.click(within(carlos).getByRole('button', { name: /Enlace y otras formas/ }))
    fireEvent.click(within(carlos).getByRole('button', { name: /Generar un enlace nuevo/ }))
    expect(within(carlos).getByRole('alert')).toHaveTextContent(/dejarán de servir/)
    expect(reenviar).not.toHaveBeenCalled()

    fireEvent.click(within(carlos).getByRole('button', { name: 'Sí, generar uno nuevo' }))
    await waitFor(() => expect(within(carlos).getByLabelText('Enlace de la invitación de Carlos Rojas')).toHaveValue('https://luxuryatelier.net/i/NUEVO'))
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

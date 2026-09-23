import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { RsvpForm } from './RsvpForm'

const respondAction = vi.fn()
vi.mock('@/app/_acciones/rsvp/actions', () => ({ respondAction: (...args: unknown[]) => respondAction(...args) }))

const invitation = getDictionary('es').invitation

const pinta = (over: Partial<Parameters<typeof RsvpForm>[0]> = {}) =>
  render(
    <RsvpForm
      dictionary={invitation}
      guestName="Yasmin Medrano Avila"
      previous={null}
      seats={4}
      token="tok"
      {...over}
    />,
  )

describe('RsvpForm', () => {
  it('dice a quién va la invitación y cuántos lugares tiene, sin preguntarlo', () => {
    pinta({ guestName: 'Familia Soto Vargas', seats: 3 })
    expect(screen.getByText('Invitación para')).toBeInTheDocument()
    expect(screen.getByText('Familia Soto Vargas')).toBeInTheDocument()
    expect(screen.getByText('3 lugares reservados')).toBeInTheDocument()
  })

  it('no pide el nombre: el enlace ya es de un invitado, y responde con el suyo', () => {
    // Cada invitación es de alguien con nombre. Pedírselo otra vez era preguntar lo que ya se sabe.
    const { container } = pinta()

    expect(screen.queryByLabelText(invitation.nameLabel)).not.toBeInTheDocument()
    expect(container.querySelector('input[name="name"]')).toHaveValue('Yasmin Medrano Avila')
    expect(screen.getByLabelText(invitation.goingLabel)).toBeInTheDocument()
    expect(screen.getByLabelText(invitation.messageLabel)).toBeInTheDocument()
    expect(screen.queryByLabelText(invitation.attendingLabel)).not.toBeInTheDocument()
  })

  it('con el «sí» manda los cupos del grupo, que es lo que el catering y las mesas usan', () => {
    const { container } = pinta()
    expect(container.querySelector('input[name="attending"]')).toHaveValue('4')
  })

  it('quien ya contestó ve su respuesta, no el formulario: se confirma una sola vez', () => {
    // El enlace acaba en el chat de toda la familia. Con el formulario abierto para siempre,
    // cualquiera podría cambiar lo que dijeron los demás.
    pinta({ previous: { attending: 2, responderName: 'Jorge Rojas', message: 'Vamos dos' } })

    expect(screen.getByText(invitation.confirmedHeading)).toBeInTheDocument()
    expect(screen.getByText('Vienen 2 de 4')).toBeInTheDocument()
    expect(screen.queryByLabelText(invitation.nameLabel)).not.toBeInTheDocument()
  })

  it('con «no podré asistir» manda cero', () => {
    const { container } = pinta()

    fireEvent.change(screen.getByLabelText(invitation.goingLabel), { target: { value: 'no' } })

    expect(container.querySelector('input[name="attending"]')).toHaveValue('0')
  })

  it('quien dijo que no, al volver ve que su respuesta ya está registrada', () => {
    pinta({ previous: { attending: 0, responderName: null, message: null } })

    expect(screen.getByText(invitation.confirmedNobody)).toBeInTheDocument()
  })

  it('lleva el token en un campo oculto', () => {
    const { container } = pinta({ seats: 1, token: 'tok-123' })
    expect(container.querySelector('input[name="token"]')).toHaveValue('tok-123')
  })

  it('al enviar dice «confirmación enviada» y cómo cambiarla, sin ofrecer modificar', async () => {
    // Se confirma una sola vez: un botón de «cambiar» tras enviar prometía algo que no existe.
    respondAction.mockResolvedValue({ status: 'success', responderName: 'Yasmin Medrano Avila' })
    pinta()

    fireEvent.submit(screen.getByRole('button', { name: invitation.submit }).closest('form')!)

    expect(await screen.findByText(invitation.confirmedHeading)).toBeInTheDocument()
    expect(screen.getByText(invitation.confirmedLocked)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cambiar|modificar/i })).not.toBeInTheDocument()
  })

  it('al confirmar que asiste entrega su pase ahí mismo; si no asiste, no hay pase', async () => {
    respondAction.mockResolvedValue({ status: 'success', responderName: 'Yasmin Medrano Avila' })
    // El QR y su botón aparecen en su sitio de la invitación, que se actualiza al guardar; aquí
    // se dice que ya está, sin repetir un segundo botón que hace lo mismo.
    const { unmount } = pinta()
    fireEvent.submit(screen.getByRole('button', { name: invitation.submit }).closest('form')!)
    expect(await screen.findByText(invitation.passReady)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: invitation.passOpen })).not.toBeInTheDocument()
    unmount()

    pinta()
    fireEvent.change(screen.getByLabelText(invitation.goingLabel), { target: { value: 'no' } })
    fireEvent.submit(screen.getByRole('button', { name: invitation.submit }).closest('form')!)
    expect(await screen.findByText(invitation.confirmedHeading)).toBeInTheDocument()
    expect(screen.queryByText(invitation.passReady)).not.toBeInTheDocument()
  })

  it('con «pildoras» el «sí» sale de entrada en el acento y sin el saludo: lo dice el diseño arriba', () => {
    // Las Editorial pintan el nombre del invitado y sus pases justo encima: repetirlo aquí
    // se leía dos veces. Y su maqueta dibuja el «sí» macizo desde el principio.
    pinta({ variant: 'pildoras' })
    expect(screen.queryByText('Invitación para')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: invitation.goingYesShort }).className).toContain('bg-[var(--color-cta)]')
    expect(screen.getByRole('button', { name: invitation.goingYesShort }).className).toContain('rounded-[20px]')
    expect(screen.getByRole('button', { name: invitation.goingNoShort }).className).not.toContain('bg-[var(--color-cta)]')

    fireEvent.click(screen.getByRole('button', { name: invitation.goingNoShort }))
    expect(screen.getByRole('button', { name: invitation.goingNoShort }).className).toContain('bg-[var(--color-cta)]')
    expect(screen.getByRole('button', { name: invitation.goingYesShort }).className).not.toContain('bg-[var(--color-cta)]')
  })

  it('con «botones-oro» da las gracias y no anuncia pase: ese diseño no lo tiene', async () => {
    // El cumpleaños no controla la entrada con un QR, así que su invitación no pinta la
    // ranura del pase: anunciarlo mandaría a buscar más abajo algo que no está.
    respondAction.mockResolvedValue({ status: 'success', responderName: 'Yasmin Medrano Avila' })
    pinta({ variant: 'botones-oro' })

    fireEvent.click(screen.getByRole('button', { name: invitation.goingYesShort }))
    fireEvent.submit(screen.getByRole('button', { name: invitation.goingYesShort }).closest('form')!)

    expect(await screen.findByText(invitation.confirmedHeading)).toBeInTheDocument()
    expect(screen.getByText(invitation.successBody)).toBeInTheDocument()
    expect(screen.queryByText(invitation.passReady)).not.toBeInTheDocument()
  })
})

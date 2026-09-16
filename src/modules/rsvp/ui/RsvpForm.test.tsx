import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { RsvpForm } from './RsvpForm'

vi.mock('@/app/_acciones/rsvp/actions', () => ({ respondAction: vi.fn() }))

const invitation = getDictionary('es').invitation

const pinta = (over: Partial<Parameters<typeof RsvpForm>[0]> = {}) =>
  render(
    <RsvpForm
      dictionary={invitation}
      previous={null}
      seats={4}
      token="tok"
      {...over}
    />,
  )

describe('RsvpForm', () => {
  it('pregunta el nombre, si asistirá y el mensaje: ni una casilla más que el diseño', () => {
    // Es la composición de la maqueta. El nombre va primero porque el enlace identifica
    // **al grupo**: en «Familia Rojas Peña» contesta uno de cuatro. Cuántos vienen no se
    // pregunta, porque el diseño no lo pregunta.
    pinta()

    expect(screen.getByLabelText(invitation.nameLabel)).toBeInTheDocument()
    expect(screen.getByLabelText(invitation.goingLabel)).toBeInTheDocument()
    expect(screen.getByLabelText(invitation.messageLabel)).toBeInTheDocument()
    expect(screen.queryByLabelText(invitation.attendingLabel)).not.toBeInTheDocument()
  })

  it('el nombre va vacío, con su marcador', () => {
    // Prellenarlo con la etiqueta del grupo hacía que la mayoría dejara «Familia Rojas
    // Peña» puesta, y entonces el campo no dice nada que no supiéramos.
    pinta()
    expect(screen.getByLabelText(invitation.nameLabel)).toHaveValue('')
    expect(screen.getByPlaceholderText(invitation.namePlaceholder)).toBeInTheDocument()
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
})

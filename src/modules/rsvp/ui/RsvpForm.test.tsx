import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { RsvpForm } from './RsvpForm'

vi.mock('../actions', () => ({ respondAction: vi.fn() }))

const invitation = getDictionary('es').invitation

const pinta = (over: Partial<Parameters<typeof RsvpForm>[0]> = {}) =>
  render(
    <RsvpForm
      dictionary={invitation}
      groupLabel="Familia Rojas Peña"
      previous={null}
      seats={4}
      token="tok"
      {...over}
    />,
  )

describe('RsvpForm', () => {
  it('pregunta el nombre, si asistirá, cuántos y el mensaje, en ese orden', () => {
    // Es la composición de la maqueta. El nombre va primero porque el enlace identifica
    // **al grupo**: en «Familia Rojas Peña» contesta uno de cuatro.
    pinta()

    expect(screen.getByLabelText(invitation.nameLabel)).toBeInTheDocument()
    expect(screen.getByLabelText(invitation.goingLabel)).toBeInTheDocument()
    expect(screen.getByLabelText(invitation.attendingLabel)).toBeInTheDocument()
    expect(screen.getByLabelText(invitation.messageLabel)).toBeInTheDocument()
  })

  it('prellena el nombre con la etiqueta del grupo: quien no lo toque deja lo de siempre', () => {
    pinta()
    expect(screen.getByLabelText(invitation.nameLabel)).toHaveValue('Familia Rojas Peña')
  })

  it('ofrece de uno al número de cupos: el cero es «no podré asistir», no una opción del desplegable', () => {
    pinta()
    const cuantos = screen.getByLabelText(invitation.attendingLabel)
    expect([...cuantos.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['1', '2', '3', '4'])
  })

  it('propone todos los cupos cuando aún no hay respuesta', () => {
    pinta()
    expect(screen.getByLabelText(invitation.attendingLabel)).toHaveValue('4')
  })

  it('preselecciona la respuesta anterior, con su nombre', () => {
    pinta({ previous: { attending: 2, responderName: 'Jorge Rojas', message: 'Vamos dos' } })

    expect(screen.getByLabelText(invitation.nameLabel)).toHaveValue('Jorge Rojas')
    expect(screen.getByLabelText(invitation.attendingLabel)).toHaveValue('2')
    expect(screen.getByLabelText(invitation.messageLabel)).toHaveValue('Vamos dos')
  })

  it('con «no podré asistir» esconde el número y manda cero', () => {
    // Quien no viene no tiene cuántos. Y el cero se sigue enviando: sin campo, el servidor
    // recibiría una respuesta sin asistentes y la rechazaría como carga inválida.
    const { container } = pinta()

    fireEvent.change(screen.getByLabelText(invitation.goingLabel), { target: { value: 'no' } })

    expect(screen.queryByLabelText(invitation.attendingLabel)).not.toBeInTheDocument()
    expect(container.querySelector('input[name="attending"]')).toHaveValue('0')
  })

  it('quien ya dijo que no vuelve a entrar con el «no» puesto', () => {
    pinta({ previous: { attending: 0, responderName: null, message: null } })

    expect(screen.queryByLabelText(invitation.attendingLabel)).not.toBeInTheDocument()
  })

  it('lleva el token en un campo oculto', () => {
    const { container } = pinta({ seats: 1, token: 'tok-123' })
    expect(container.querySelector('input[name="token"]')).toHaveValue('tok-123')
  })
})

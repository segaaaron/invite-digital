import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { RsvpForm } from './RsvpForm'

vi.mock('../actions', () => ({ respondAction: vi.fn() }))

const invitation = getDictionary('es').invitation

describe('RsvpForm', () => {
  it('ofrece de cero al número de cupos, ambos incluidos', () => {
    render(<RsvpForm dictionary={invitation} previous={null} seats={4} token="tok" />)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['0', '1', '2', '3', '4'])
  })

  it('propone todos los cupos cuando aún no hay respuesta', () => {
    render(<RsvpForm dictionary={invitation} previous={null} seats={4} token="tok" />)
    expect(screen.getByLabelText(invitation.attendingLabel)).toHaveValue('4')
  })

  it('preselecciona la respuesta anterior', () => {
    render(<RsvpForm dictionary={invitation} previous={{ attending: 2, message: 'Vamos dos' }} seats={4} token="tok" />)
    expect(screen.getByLabelText(invitation.attendingLabel)).toHaveValue('2')
    expect(screen.getByLabelText(invitation.messageLabel)).toHaveValue('Vamos dos')
  })

  it('lleva el token en un campo oculto', () => {
    const { container } = render(<RsvpForm dictionary={invitation} previous={null} seats={1} token="tok-123" />)
    expect(container.querySelector('input[name="token"]')).toHaveValue('tok-123')
  })
})

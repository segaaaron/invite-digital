import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PrivacyForm } from './PrivacyForm'

vi.mock('../actions', () => ({ setEventPrivacyAction: vi.fn() }))

describe('PrivacyForm', () => {
  it('sin la contraseña en el plan, la opción se ve apagada y dice por qué', () => {
    render(<PrivacyForm contrasenaIncluida={false} eventId="e1" eventSlug="boda" hasPassword={false} />)
    expect(screen.getByRole('radio', { name: /protegida con contraseña/i })).toBeDisabled()
    expect(screen.getByText(/tu plan no la incluye/i)).toBeInTheDocument()
  })

  it('con la contraseña en el plan se puede elegir', () => {
    render(<PrivacyForm eventId="e1" eventSlug="boda" hasPassword={false} />)
    expect(screen.getByRole('radio', { name: /protegida con contraseña/i })).toBeEnabled()
  })
})

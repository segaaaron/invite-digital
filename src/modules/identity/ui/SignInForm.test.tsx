import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SignInForm } from './SignInForm'

vi.mock('../actions', () => ({ signInAction: vi.fn() }))

describe('SignInForm', () => {
  it('pide correo y contraseña', () => {
    render(<SignInForm />)
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })

  it('no ofrece registro ni recuperación: no existen', () => {
    render(<SignInForm />)
    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/olvid/i)).not.toBeInTheDocument()
  })
})

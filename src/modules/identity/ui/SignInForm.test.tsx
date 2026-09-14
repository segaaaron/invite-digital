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

  it('no ofrece registro: las cuentas las da de alta el admin', () => {
    render(<SignInForm />)
    expect(screen.queryByText(/crear cuenta/i)).not.toBeInTheDocument()
  })

  it('pero sí ofrece recuperar la contraseña', () => {
    // Esta prueba decía lo contrario, y era cierto mientras no había proveedor de correo:
    // un enlace de recuperación sin forma de mandar el código es una promesa vacía. Desde
    // que hay correo, lo que sería un fallo es **no** ofrecerlo.
    render(<SignInForm />)

    expect(screen.getByRole('link', { name: /olvidaste tu contraseña/i })).toHaveAttribute(
      'href',
      '/panel/recuperar',
    )
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CampoContrasena } from './CampoContrasena'

describe('CampoContrasena', () => {
  it('nace oculta y el ojo la muestra y la vuelve a ocultar, sin enviar el formulario', () => {
    render(
      <form onSubmit={() => { throw new Error('no debe enviar') }}>
        <label htmlFor="c">Contraseña inicial</label>
        <CampoContrasena id="c" name="password" />
      </form>,
    )
    const campo = screen.getByLabelText('Contraseña inicial')
    expect(campo).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }))
    expect(campo).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }))
    expect(campo).toHaveAttribute('type', 'password')
  })
})

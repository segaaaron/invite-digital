import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CompareSlider } from './CompareSlider'

const props = {
  imageAlt: 'Suite botánica',
  luxeLabel: 'LUXE',
  luxe: ['Sobre 3D', 'Dominio propio'],
  traditionalLabel: 'Tradicional',
  traditional: ['Imagen estática', 'Plantilla con logo'],
  sliderLabel: 'Comparar',
}

describe('CompareSlider', () => {
  it('enseña los dos lados, no solo el que asoma', () => {
    render(<CompareSlider {...props} />)
    expect(screen.getByText('Sobre 3D')).toBeInTheDocument()
    expect(screen.getByText('Imagen estática')).toBeInTheDocument()
  })

  it('el control es un deslizador con nombre y se maneja con el teclado', () => {
    render(<CompareSlider {...props} />)
    const control = screen.getByRole('slider', { name: 'Comparar' })
    // Un comparador que solo responde al arrastre deja fuera a quien navega con teclado.
    expect(control).toHaveValue('50')

    fireEvent.change(control, { target: { value: '80' } })
    expect(control).toHaveValue('80')
  })

  it('los dos paneles se recortan contra el deslizador, cada uno por su lado', () => {
    // La maqueta enseña la invitación de verdad en medio, con «Tradicional» a la
    // izquierda y «LUXE» a la derecha: el deslizador reparte el ancho entre los dos, no
    // tapa uno con el otro.
    render(<CompareSlider {...props} />)

    const tradicional = screen.getByTestId('panel-tradicional')
    const luxe = screen.getByTestId('panel-luxe')
    expect(tradicional.style.clipPath).toBe('inset(0 50% 0 0)')
    expect(luxe.style.clipPath).toBe('inset(0 0 0 50%)')

    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } })
    expect(tradicional.style.clipPath).toBe('inset(0 80% 0 0)')
    expect(luxe.style.clipPath).toBe('inset(0 0 0 20%)')
  })
})

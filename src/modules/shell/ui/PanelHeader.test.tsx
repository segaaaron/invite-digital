import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PanelHeader } from './PanelHeader'

describe('PanelHeader', () => {
  it('destaca en verde la parte del título que la maqueta pone en itálica', () => {
    const { container } = render(<PanelHeader highlight="Marcia & Ricardo" title="Bienvenida, " />)
    const destacado = container.querySelector('b')

    expect(destacado?.textContent).toBe('Marcia & Ricardo')
    expect(destacado?.className).toContain('text-sage')
  })

  it('el título sigue leyéndose entero, destacado incluido', () => {
    render(<PanelHeader highlight="Marcia" title="Bienvenida, " />)
    expect(screen.getByRole('heading')).toHaveTextContent('Bienvenida, Marcia')
  })

  it('sin destacado no pinta nada de más', () => {
    const { container } = render(<PanelHeader title="Invitados" />)
    expect(container.querySelector('b')).toBeNull()
  })
})

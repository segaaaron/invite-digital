import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PanelHeader } from './PanelHeader'

describe('PanelHeader', () => {
  it('el destacado del título va en su propio elemento', () => {
    const { container } = render(<PanelHeader highlight="Marcia & Ricardo" title="Bienvenida, " />)
    expect(container.querySelector('b')?.textContent).toBe('Marcia & Ricardo')
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

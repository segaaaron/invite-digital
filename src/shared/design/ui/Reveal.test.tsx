import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Reveal } from './Reveal'

const stubReducedMotion = (reduce: boolean): void => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduced-motion') ? reduce : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Reveal', () => {
  it('muestra el contenido sin opacidad animada cuando se pide movimiento reducido', () => {
    stubReducedMotion(true)
    render(
      <Reveal>
        <p>Contenido</p>
      </Reveal>,
    )

    const wrapper = screen.getByText('Contenido').parentElement
    expect(wrapper).not.toHaveStyle({ opacity: '0' })
  })

  it('renderiza el contenido también con movimiento permitido', () => {
    stubReducedMotion(false)
    render(
      <Reveal>
        <p>Contenido</p>
      </Reveal>,
    )

    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })
})

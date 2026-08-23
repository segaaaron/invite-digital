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

  it('con `onMount` aparece al cargar, sin esperar a que la sección entre en pantalla', () => {
    // El hero no puede depender del scroll: si el navegador restaura la posición o la
    // sección nunca llega al 25 % visible, el contenido se queda invisible para siempre.
    // Pasó: la portada se abrió con el sobre y sin una sola palabra.
    stubReducedMotion(false)
    render(
      <Reveal onMount>
        <p>Contenido</p>
      </Reveal>,
    )

    // Se comprueba el contrato, no el píxel: en jsdom no hay observador de intersección,
    // así que un `toHaveStyle` pasaría igual con el fallo dentro.
    const wrapper = screen.getByText('Contenido').parentElement
    expect(wrapper).toHaveAttribute('data-reveal', 'mount')
  })

  it('por defecto espera a que la sección entre en pantalla', () => {
    stubReducedMotion(false)
    render(
      <Reveal>
        <p>Contenido</p>
      </Reveal>,
    )

    expect(screen.getByText('Contenido').parentElement).toHaveAttribute('data-reveal', 'scroll')
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

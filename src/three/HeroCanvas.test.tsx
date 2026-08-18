import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeroCanvas } from './HeroCanvas'

const POSTER_ALT = 'Sobre de algodón con sello de cera dorado'

function stubMatchMedia(reducedMotion: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: reducedMotion,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
}

describe('HeroCanvas', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('entrega el póster cuando el equipo no puede con la escena', () => {
    stubMatchMedia(false)
    render(<HeroCanvas alt={POSTER_ALT} posterSrc="/hero/envelope-poster.avif" />)

    const poster = screen.getByAltText(POSTER_ALT)
    expect(poster).toBeInTheDocument()
    expect(poster.getAttribute('src')).toContain('envelope-poster')
  })

  it('entrega el póster cuando el usuario pide movimiento reducido', () => {
    stubMatchMedia(true)
    render(<HeroCanvas alt={POSTER_ALT} posterSrc="/hero/envelope-poster.avif" />)

    expect(screen.getByAltText(POSTER_ALT)).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeroCanvas } from './HeroCanvas'
import { resetSceneCapability } from './useSceneCapability'

const POSTER_ALT = 'Sobre de algodón con sello de cera dorado'

function stubEnvironment({ reducedMotion, webgl2 }: { reducedMotion: boolean; webgl2: boolean }): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: reducedMotion,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
  // jsdom has no WebGL at all, so the capable case has to be faked explicitly —
  // otherwise every case exercises the same branch and the suite proves nothing.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
    kind === 'webgl2' && webgl2 ? ({ getExtension: () => null } as unknown as RenderingContext) : null) as never)
}

describe('HeroCanvas', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    resetSceneCapability()
  })

  it('entrega el póster cuando el equipo no puede con la escena', () => {
    stubEnvironment({ reducedMotion: false, webgl2: false })
    render(<HeroCanvas alt={POSTER_ALT} closeLabel="Cerrar el sobre" openLabel="Abrir el sobre" posterSrc="/hero/envelope-poster.avif" />)

    const poster = screen.getByAltText(POSTER_ALT)
    expect(poster).toBeInTheDocument()
    expect(poster.getAttribute('src')).toContain('envelope-poster')
  })

  it('entrega el póster cuando el usuario pide movimiento reducido, aunque haya WebGL2', () => {
    stubEnvironment({ reducedMotion: true, webgl2: true })
    render(<HeroCanvas alt={POSTER_ALT} closeLabel="Cerrar el sobre" openLabel="Abrir el sobre" posterSrc="/hero/envelope-poster.avif" />)

    expect(screen.getByAltText(POSTER_ALT)).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('en un equipo capaz sigue enseñando el póster: la escena entra al abrir el sobre', () => {
    // El hero de la maqueta es la composición de sobres. La escena es lo que aparece
    // cuando alguien la pide; antes se comía la portada en cuanto había WebGL2.
    stubEnvironment({ reducedMotion: false, webgl2: true })
    render(<HeroCanvas alt={POSTER_ALT} closeLabel="Cerrar el sobre" openLabel="Abrir el sobre" posterSrc="/hero/envelope-poster.avif" />)

    expect(screen.getByAltText(POSTER_ALT)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Abrir el sobre' }))

    expect(screen.getByRole('img', { name: POSTER_ALT })).toBeInTheDocument()
    expect(screen.queryByAltText(POSTER_ALT)).toBeNull()
  })

  it('expone un control de teclado para abrir el sobre', () => {
    stubEnvironment({ reducedMotion: false, webgl2: true })
    render(
      <HeroCanvas alt={POSTER_ALT} closeLabel="Cerrar el sobre" openLabel="Abrir el sobre" posterSrc="/hero/envelope-poster.avif" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Abrir el sobre' }))

    const toggle = screen.getByRole('button', { name: 'Cerrar el sobre' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Abrir el sobre' })).toBeInTheDocument()
  })
})

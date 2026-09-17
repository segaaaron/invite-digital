import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { conMovimientoReducido, conObservadorQueNuncaDispara } from './kit/test-helpers'
import { propsDePrueba } from './test-props'
import { BodaBotView } from './bodas/boda-bot.view'
import { CONTENIDO_DE_MUESTRA as BOTANICA } from './bodas/boda-bot.content'
import { XvView } from './xv/xv.view'
import { CONTENIDO_DE_MUESTRA as SOFIA } from './xv/xv.content'

beforeEach(() => {
  conObservadorQueNuncaDispara()
  conMovimientoReducido(true)
})

describe('la paleta del código de vestimenta', () => {
  for (const [nombre, Vista, contenido] of [
    ['XV', XvView, SOFIA],
    ['Botánica', BodaBotView, BOTANICA],
  ] as const) {
    it(`${nombre} pinta un círculo por color elegido`, () => {
      render(<Vista {...propsDePrueba({ content: { ...contenido, dressCode: { ...contenido.dressCode, colors: ['#a7c7e7', '#1d2b4f'] } } })} />)
      const paleta = screen.getByRole('list', { name: 'Colores sugeridos' })
      expect(within(paleta).getAllByRole('listitem').map((c) => c.getAttribute('title'))).toEqual(['#a7c7e7', '#1d2b4f'])
    })
  }
})

describe('el mapa del lugar', () => {
  it('es el dibujo del diseño, y tocarlo abre Google Maps', () => {
    const href = 'https://www.google.com/maps/place/Hacienda/@-16.5001,-68.1193,17z'
    const { container } = render(<XvView {...propsDePrueba({ content: { ...SOFIA, map: { label: 'HACIENDA', href } } })} />)
    expect(container.querySelector('iframe')).toBeNull()
    const enlace = screen.getByRole('link', { name: /HACIENDA/ })
    expect(enlace).toHaveAttribute('href', href)
    expect(enlace).toHaveAttribute('target', '_blank')
  })
})

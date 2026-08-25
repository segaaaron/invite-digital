import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { panelNav } from './nav'
import { NAV_ICONS } from './nav-icons'

/** Emoji, símbolos y pictogramas: lo que una fuente del sistema pinta a su manera. */
const EMOJI = /\p{Extended_Pictographic}/u

describe('los iconos de la barra del panel', () => {
  it('cada entrada de la navegación tiene su dibujo', () => {
    for (const seccion of panelNav('boda-de-prueba')) {
      for (const item of seccion.items) {
        expect(NAV_ICONS[item.icon], `«${item.label}» no tiene icono`).toBeDefined()
      }
    }
  })

  it('ninguno es un emoji: el sistema los pinta a todo color y sobre la barra oscura cantan', () => {
    for (const [clave, icono] of Object.entries(NAV_ICONS)) {
      const { container } = render(<span>{icono}</span>)
      expect(container.textContent ?? '', `el icono «${clave}» trae texto dentro`).toBe('')
      expect(container.querySelector('svg'), `el icono «${clave}» no es un SVG`).not.toBeNull()
    }
  })

  it('y tampoco los hay escritos a mano en los rótulos de la barra', () => {
    for (const seccion of panelNav('boda-de-prueba')) {
      expect(seccion.label).not.toMatch(EMOJI)
      for (const item of seccion.items) expect(item.label, item.label).not.toMatch(EMOJI)
    }
  })

  it('heredan la tinta de la fila en vez de traer color propio', () => {
    // Con un color dentro, el icono de la fila activa seguiría siendo del color viejo
    // sobre el fondo oscuro, y habría que mantener dos paletas.
    for (const [clave, icono] of Object.entries(NAV_ICONS)) {
      const { container } = render(<span>{icono}</span>)
      expect(container.innerHTML, `el icono «${clave}» lleva un color dentro`).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(container.querySelector('svg')).toHaveAttribute('stroke', 'currentColor')
    }
  })
})

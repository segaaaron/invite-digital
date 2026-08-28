import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FONT_FILES, FONT_VARIABLES, type FontKey } from './font-manifest'

describe('las tipografías de los temas de invitación', () => {
  it('declara una variable CSS por familia', () => {
    // Doce familias: las tres que ya estaban —Cormorant, Space Grotesk y JetBrains Mono—
    // más las nueve que piden los dieciséis diseños. Jost no está: es de la web pública
    // marfil y no la usa ningún tema.
    expect(Object.keys(FONT_VARIABLES)).toHaveLength(12)
    for (const variable of Object.values(FONT_VARIABLES)) {
      expect(variable).toMatch(/^--font-[a-z-]+$/)
    }
  })

  it('no repite ninguna variable CSS', () => {
    // Dos familias con la misma variable dejan a una pintando con la otra, y el
    // typecheck no dice nada porque las dos son cadenas.
    const variables = Object.values(FONT_VARIABLES)
    expect(new Set(variables).size).toBe(variables.length)
  })

  it('tiene en disco todos los ficheros que declara', () => {
    // Sin esto, `next/font/local` falla al compilar y no en la prueba, que es justo
    // cuando cuesta caro descubrirlo: el build tarda minutos y muere sin decir cuál.
    for (const archivo of FONT_FILES) {
      expect(existsSync(join(process.cwd(), 'public/fonts', archivo)), archivo).toBe(true)
    }
  })

  it('cubre las doce claves sin dejar ninguna suelta', () => {
    const claves: FontKey[] = [
      'cormorant',
      'spaceGrotesk',
      'jetbrainsMono',
      'greatVibes',
      'alexBrush',
      'allura',
      'italiana',
      'marcellus',
      'cinzel',
      'dmSans',
      'newsreader',
      'spectral',
    ]
    for (const clave of claves) expect(FONT_VARIABLES[clave]).toBeDefined()
  })
})

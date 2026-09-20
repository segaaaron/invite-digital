import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FONT_FILES, FONT_VARIABLES, type FontKey } from './font-manifest'

describe('las tipografías de los temas de invitación', () => {
  it('declara una variable CSS por familia', () => {
    // Las que piden los diseños de invitación. Crece con la colección: Outfit entró con
    // «Esencia» y Bodoni Moda con «Sobre Lacrado». Jost no está: es de la web pública
    // marfil y no la usa ningún tema.
    expect(Object.keys(FONT_VARIABLES)).toHaveLength(15)
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

describe('el manifiesto y el cargador', () => {
  // `fonts.ts` no se puede importar desde una prueba —`next/font` es una macro que
  // resuelve al compilar—, así que se lee como texto. Es feo y es lo único que caza esto.
  const cargador = readFileSync(join(process.cwd(), 'src/shared/design/fonts.ts'), 'utf8')

  it('declara en el cargador cada variable CSS del manifiesto', () => {
    // `next/font` exige literales: `variable: FONT_VARIABLES.cinzel` aborta el build con
    // «Font loader values must be explicitly written literals» y el typecheck no dice nada,
    // porque es una cadena perfectamente válida. Se descubre al abrir la página.
    //
    // Como los literales están duplicados por obligación, esta prueba es lo que impide que
    // los dos sitios se separen sin que nadie se entere.
    for (const variable of Object.values(FONT_VARIABLES)) {
      expect(cargador, variable).toContain(`variable: '${variable}'`)
    }
  })

  it('carga en el cargador cada fichero del manifiesto', () => {
    for (const archivo of FONT_FILES) {
      expect(cargador, archivo).toContain(archivo)
    }
  })

  it('no deja ninguna referencia ni spread donde `next/font` exige un literal', () => {
    // Se juzga el código, no la prosa: el comentario que explica por qué esa referencia no
    // puede estar ahí es justo lo que se quiere conservar.
    const codigo = cargador.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(codigo).not.toMatch(/variable:\s*FONT_VARIABLES/)
    expect(codigo).not.toMatch(/fallback:\s*\[\.\.\./)
  })
})

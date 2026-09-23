import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FONT_VARIABLES, type FontKey } from '@/shared/design/font-manifest'
import { fiestaDeCategoria, type Fiesta } from '../../domain/fiesta'
import { themeDefinitions } from './registry'

/**
 * Un tema declara **las familias que baja**, y el layout del invitado no carga ninguna más:
 * es lo que impide que una invitación de cinco tipografías arrastre las doce. El precio es
 * que una familia que se pinta y no se declara **no falla**: la variable CSS no existe, el
 * navegador cae a la de respaldo y el diseño se ve con otra letra sin un solo error.
 *
 * Pasó con las portadas. Estuvieron escondidas en la vista previa desde el principio, así
 * que nadie las vio: «Editorial» escribía sus iniciales en Italiana sin declararla, y
 * «Palacio Griego» su «15 AÑOS» igual. Se veía, y parecía otro diseño.
 *
 * Esto se comprueba leyendo los ficheros y no renderizando porque `Component` es un
 * `dynamic()`: en una prueba no resuelve, y el árbol que habría que recorrer no llega a
 * existir.
 */

const RAIZ = resolve(__dirname)

/** De `--font-great-vibes` a `greatVibes`, que es como lo declara el tema. */
const CLAVE_POR_VARIABLE = new Map<string, FontKey>(
  Object.entries(FONT_VARIABLES).map(([clave, variable]) => [variable, clave as FontKey]),
)

function resolverImport(desde: string, especificador: string): string | null {
  if (!especificador.startsWith('.')) return null
  const base = join(dirname(desde), especificador)
  for (const candidato of [`${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts')]) {
    if (existsSync(candidato)) return candidato
  }
  return null
}

/**
 * Los ficheros que acaban pintando un tema: su vista, su piel, sus portadas y lo que del
 * kit usen, siguiendo los `import` relativos. Se queda dentro de `themes/` a propósito:
 * fuera están el diccionario y el dominio, que no llevan tipografías.
 */
function alcanceDe(entrada: string): string[] {
  const vistos = new Set<string>()
  const cola = [entrada]
  while (cola.length > 0) {
    const actual = cola.pop()
    if (actual === undefined || vistos.has(actual)) continue
    vistos.add(actual)
    const fuente = readFileSync(actual, 'utf8')
    for (const [, especificador] of fuente.matchAll(/from '([^']+)'/g)) {
      const destino = resolverImport(actual, especificador ?? '')
      if (destino !== null && destino.startsWith(RAIZ) && !/\.test\.tsx?$/.test(destino)) cola.push(destino)
    }
  }
  return [...vistos]
}

function familiasQuePinta(entrada: string): Set<FontKey> {
  const usadas = new Set<FontKey>()
  for (const fichero of alcanceDe(entrada)) {
    for (const [, variable] of readFileSync(fichero, 'utf8').matchAll(/var\((--font-[a-z-]+)\)/g)) {
      const clave = CLAVE_POR_VARIABLE.get(variable ?? '')
      if (clave !== undefined) usadas.add(clave)
    }
  }
  return usadas
}

describe('las tipografías de cada diseño', () => {
  // La carpeta sale de la fiesta del diseño, no de un `startsWith('xv')`: un diseño que
  // viva en otra —«cumple-beer», en `cumples/`— se quedaría fuera y la prueba lo daría por
  // bueno sin haberlo mirado.
  const CARPETA: Record<Fiesta, string> = { boda: 'bodas', xv: 'xv', cumple: 'cumples' }
  const conVista = themeDefinitions()
    .map((tema) => ({ tema, vista: join(RAIZ, CARPETA[fiestaDeCategoria(tema.categorySlug)], `${tema.key}.view.tsx`) }))
    .filter(({ vista }) => existsSync(vista))

  it('encuentra la vista de cada diseño, para que la prueba no pase por no mirar nada', () => {
    expect(conVista).toHaveLength(34)
  })

  it.each(conVista)('«$tema.key» declara todas las que pinta', ({ tema, vista }) => {
    const declaradas = new Set<FontKey>(tema.fonts)
    const sinDeclarar = [...familiasQuePinta(vista)].filter((clave) => !declaradas.has(clave))

    expect(sinDeclarar).toEqual([])
  })
})

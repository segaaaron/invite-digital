import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { themeDefinitions } from '../registry'
import { pielDeRanuras, variablesDeRanuras } from './slot-skin'

const RAIZ = resolve(__dirname, '..')

function resolverImport(desde: string, especificador: string): string | null {
  if (!especificador.startsWith('.')) return null
  const base = join(dirname(desde), especificador)
  for (const candidato of [`${base}.tsx`, `${base}.ts`]) if (existsSync(candidato)) return candidato
  return null
}

/**
 * Lo que acaba pintando un diseño, siguiendo sus `import` relativos.
 *
 * Hace falta porque siete de los ocho XV son una línea que delega en `XvSharedView`: mirar
 * solo su fichero daría verde sin haber comprobado nada.
 */
function fuenteDe(entrada: string): string {
  const vistos = new Set<string>()
  const cola = [entrada]
  let todo = ''
  while (cola.length > 0) {
    const actual = cola.pop()
    if (actual === undefined || vistos.has(actual)) continue
    vistos.add(actual)
    const fuente = readFileSync(actual, 'utf8')
    todo += fuente
    for (const [, especificador] of fuente.matchAll(/from '([^']+)'/g)) {
      const destino = resolverImport(actual, especificador ?? '')
      if (destino !== null && destino.startsWith(RAIZ) && !/\.test\.tsx?$/.test(destino)) cola.push(destino)
    }
  }
  return todo
}

describe('la piel de las ranuras', () => {
  it('saca los fondos del acento con alfa, sin inventar un color', () => {
    const piel = pielDeRanuras({ acento: '#c19b4a', sobreAcento: '#ffffff', tinta: '#2b2723' })

    expect(piel.panel).toBe('rgba(193, 155, 74, 0.07)')
    expect(piel.linea).toBe('rgba(193, 155, 74, 0.3)')
    expect(piel.tintaSuave).toBe('rgba(43, 39, 35, 0.82)')
  })

  it('deja pasar un color que no es hexadecimal en vez de romperlo', () => {
    // Las pieles de XV traen su vidrio ya en `rgba()`: si esto intentara volver a
    // interpretarlo, el panel saldría vacío y la tarjeta sin fondo.
    const piel = pielDeRanuras({ acento: 'rgba(255,255,255,.42)', sobreAcento: '#fff', tinta: '#000000' })

    expect(piel.panel).toBe('rgba(255,255,255,.42)')
  })

  it('escribe los mismos nombres que declara la hoja de tokens', () => {
    // Ese es todo el mecanismo: el diseño los redefine en su `<article>` y las cuatro
    // piezas que no dibuja él —RSVP, regalos, respuesta, pase— heredan su paleta sin que
    // haya que tocar una sola de sus clases.
    const vars = variablesDeRanuras(pielDeRanuras({ acento: '#c19b4a', sobreAcento: '#fff', tinta: '#2b2723' }))

    expect(Object.keys(vars)).toContain('--color-ink')
    expect(Object.keys(vars)).toContain('--color-bg-raised')
    expect(Object.keys(vars)).toContain('--color-line')
    expect(Object.keys(vars)).toContain('--color-on-gold')
  })
})

describe('los dieciséis diseños', () => {
  const vistas = themeDefinitions()
    .map((tema) => ({ clave: tema.key, ruta: join(RAIZ, tema.key.startsWith('xv') ? 'xv' : 'bodas', `${tema.key}.view.tsx`) }))
    .filter(({ ruta }) => existsSync(ruta))

  it('son dieciséis, para que la prueba no pase por no mirar nada', () => {
    expect(vistas).toHaveLength(16)
  })

  it.each(vistas)('«$clave» le presta su paleta a las ranuras', ({ ruta }) => {
    // Sin esto, el formulario de RSVP entra marfil y dorado dentro de una invitación
    // guinda: un recuadro blanco con letra parda en mitad del diseño. Se veía, y llevaba
    // así desde el primer tema.
    const fuente = fuenteDe(ruta)

    expect(fuente).toContain('variablesDeRanuras(')
    expect(fuente).toContain('...RANURAS')
  })
})

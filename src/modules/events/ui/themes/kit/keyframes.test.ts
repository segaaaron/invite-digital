import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const HOJA = resolve(__dirname, 'keyframes.css')
const SRC = resolve(__dirname, '../../../../..')

function ficheros(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre)
    if (statSync(ruta).isDirectory()) return nombre === 'node_modules' ? [] : ficheros(ruta)
    return /\.(tsx?|css)$/.test(nombre) ? [ruta] : []
  })
}

/**
 * Una animación declarada y que nadie dispara no rompe nada, no sale en ninguna prueba y no
 * se ve: es exactamente la forma que tenía el fallo de esta sesión al revés. Había cinco
 * —dos pétalos laterales, un parpadeo, un latido y un brillo— traídas de diseños de la
 * maqueta que este proyecto no porta, y ninguna se usaba. El riesgo no es el peso: es que
 * la hoja deja de decir qué se mueve en estas invitaciones.
 *
 * El nombre puede llegar compuesto —`theme-drift-${drift}`—, así que el uso se busca por el
 * nombre completo **y** por su prefijo hasta la última pieza.
 */
describe('los fotogramas de los temas', () => {
  it('están todos en uso', () => {
    const hoja = readFileSync(HOJA, 'utf8')
    const definidos = [...hoja.matchAll(/@keyframes\s+(theme-[\w-]+)/g)].map(([, nombre]) => nombre ?? '')

    expect(definidos.length).toBeGreaterThan(20)

    // La propia hoja cuenta como uso —`.theme-sway-slow` dispara `theme-leafSway` desde
    // ahí—, pero sin sus cabeceras: si no, cada `@keyframes` se declararía en uso a sí
    // mismo y la prueba no comprobaría nada.
    const fuentes = ficheros(SRC)
      .map((ruta) => {
        const texto = readFileSync(ruta, 'utf8')
        return ruta === HOJA ? texto.replace(/@keyframes\s+theme-[\w-]+/g, '') : texto
      })
      .join('\n')

    const usado = (nombre: string): boolean => {
      if (fuentes.includes(nombre)) return true
      // `theme-drift-up` se escribe `theme-drift-${drift}`: se busca el tronco.
      const tronco = nombre.slice(0, nombre.lastIndexOf('-') + 1)
      return tronco.length > 'theme-'.length && fuentes.includes(`${tronco}$`)
    }

    expect(definidos.filter((nombre) => !usado(nombre))).toEqual([])
  })
})

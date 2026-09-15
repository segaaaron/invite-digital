import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Las reglas de dependencia de los módulos, sin excepciones (15 de septiembre de 2026).
 *
 * 1. **Entre módulos se habla por el `index.ts`.** Lo transversal vive en `@/shared`; lo que un
 *    módulo ofrece a otros —tipos y funciones puras— lo exporta su índice.
 * 2. **Ningún módulo depende de `src/app`**: ni de la composición ni de la guardia de sesión.
 *    Las Server Actions, que sí la necesitan, son puntos de entrada y viven en
 *    `src/app/_acciones/<módulo>/`.
 * 3. **Solo la interfaz de un módulo llama a esas acciones**, que es lo que hace un formulario.
 */
function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return ficheros(ruta)
    return /\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : []
  })
}

const raiz = join(process.cwd(), 'src/modules')
const fuentes = ficheros(raiz).map((fichero) => ({ relativo: fichero.slice(raiz.length + 1), texto: readFileSync(fichero, 'utf8') }))
const importsDe = (texto: string) => [...texto.matchAll(/from '([^']+)'/g)].map((m) => m[1] ?? '')

describe('reglas de dependencia de los módulos', () => {
  it('ningún módulo entra por dentro en otro: se habla por el index.ts', () => {
    const infracciones = fuentes.flatMap(({ relativo, texto }) => {
      const propio = relativo.split('/')[0]
      return importsDe(texto)
        .map((ruta) => /^@\/modules\/([a-z-]+)\/(.+)$/.exec(ruta))
        .filter((m): m is RegExpExecArray => m !== null && m[1] !== propio)
        .map((m) => `${relativo} → ${m[0]}`)
    })
    expect(infracciones).toEqual([])
  })

  it('ningún módulo depende de src/app, y solo su interfaz llama a las Server Actions', () => {
    const infracciones = fuentes.flatMap(({ relativo, texto }) =>
      importsDe(texto)
        .filter((ruta) => ruta.startsWith('@/app/'))
        .filter((ruta) => !(ruta.startsWith('@/app/_acciones/') && relativo.split('/')[1] === 'ui' && ruta !== '@/app/_acciones/sesion'))
        .map((ruta) => `${relativo} → ${ruta}`),
    )
    expect(infracciones).toEqual([])
  })
})

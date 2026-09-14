import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VIEWPORT } from '@/shared/config/viewport'

/** Cada fichero de `app/` que emite `<html>` es una raíz de layout. */
function raices(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) return raices(ruta)
    // Al principio de línea: el JSX, no un comentario que lo nombre entre comillas.
    return /\.tsx$/.test(entrada.name) && /^\s*<html\b/m.test(readFileSync(ruta, 'utf8')) ? [ruta] : []
  })
}

/**
 * Esta prueba decía lo contrario hasta hoy: exigía `maximumScale: 1` y
 * `userScalable: false`. Se le dio la vuelta a propósito, y el motivo está en
 * `shared/config/viewport.ts`: iOS ignora ese bloqueo desde la versión 10, así que no
 * impedía ampliar —solo lo volvía brusco— y de paso incumplía accesibilidad.
 */
describe('el zoom', () => {
  it('no se bloquea: ni tope de escala ni `user-scalable=no`', () => {
    expect(VIEWPORT.maximumScale).toBeUndefined()
    expect(VIEWPORT.userScalable).toBeUndefined()
  })

  // Una raíz nueva que no lo exporte se quedaría sin `width=device-width`, y entonces el
  // teléfono pinta la página a 980 px y la encoge. Por eso se buscan todas.
  it('lo exportan todas las raíces de layout', () => {
    const encontradas = raices(join(process.cwd(), 'src/app'))
    expect(encontradas.length).toBeGreaterThanOrEqual(5)
    for (const raiz of encontradas) {
      expect(readFileSync(raiz, 'utf8'), raiz).toMatch(/export const viewport = VIEWPORT/)
    }
  })

  it('y `touch-action` no corta el pellizco', () => {
    // `pan-x pan-y` desactiva el zoom táctil en iOS, que era la otra mitad del bloqueo.
    //
    // Se miran las **reglas**, no el fichero entero: el comentario que explica por qué se
    // quitó nombra la declaración, y una búsqueda a secas lo daba por una regla viva.
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')

    expect(sinComentarios).not.toMatch(/touch-action:\s*pan-x pan-y/)
  })

  it('el desbordamiento lateral se recorta en la raíz, no con el zoom', () => {
    // `overflow-x` solo en `body` no contiene nada: `html` sigue desplazándose, que es
    // justo lo que pasaba —la portada medía 1077 px de ancho en un teléfono de 390.
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    expect(css).toMatch(/html,\s*body\s*\{[^}]*overflow-x:\s*clip/)
  })
})

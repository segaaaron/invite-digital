import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SIN_ZOOM } from '@/shared/config/viewport'

/** Cada fichero de `app/` que emite `<html>` es una raíz de layout. */
function raices(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(dir, entrada.name)
    if (entrada.isDirectory()) return raices(ruta)
    // Al principio de línea: el JSX, no un comentario que lo nombre entre comillas.
    return /\.tsx$/.test(entrada.name) && /^\s*<html\b/m.test(readFileSync(ruta, 'utf8')) ? [ruta] : []
  })
}

describe('el zoom', () => {
  it('está cortado en el viewport', () => {
    expect(SIN_ZOOM).toMatchObject({ maximumScale: 1, userScalable: false })
  })

  // Una raíz de layout nueva que no lo exporte vuelve a dejar ampliar en Android, sin un
  // solo error: por eso se buscan todas, no se enumeran.
  it('lo exportan todas las raíces de layout', () => {
    const encontradas = raices(join(process.cwd(), 'src/app'))
    expect(encontradas.length).toBeGreaterThanOrEqual(5)
    for (const raiz of encontradas) {
      expect(readFileSync(raiz, 'utf8'), raiz).toMatch(/export const viewport = SIN_ZOOM/)
    }
  })

  it('iOS lo corta por touch-action, que es lo único que respeta', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    expect(css).toMatch(/\*\s*\{\s*touch-action:\s*pan-x pan-y;\s*\}/)
  })
})

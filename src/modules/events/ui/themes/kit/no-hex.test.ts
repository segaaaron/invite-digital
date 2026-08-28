import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function archivosDe(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre)
    if (statSync(ruta).isDirectory()) return archivosDe(ruta)
    return /\.tsx?$/.test(nombre) ? [ruta] : []
  })
}

describe('el kit de temas', () => {
  it('no lleva ni un color hexadecimal', () => {
    // El kit lo comparten los dieciséis diseños a la vez. Un `#d4b483` dentro de
    // `MapPreview` reaparecería en la boda botánica, que es verde, y en el bosque
    // encantado, que también.
    //
    // Los hexadecimales de un diseño viven en la `palette` de su `ThemeDefinition`, que es
    // la excepción que el proyecto ya tenía para el acento de una plantilla, ampliada con
    // su motivo. Aquí llegan por prop, siempre, y sin valor por defecto: un defecto es un
    // hexadecimal escondido.
    const raiz = join(process.cwd(), 'src/modules/events/ui/themes/kit')
    const culpables = archivosDe(raiz)
      .filter((ruta) => !ruta.endsWith('.test.ts') && !ruta.endsWith('.test.tsx'))
      .filter((ruta) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(ruta, 'utf8')))

    expect(culpables.map((ruta) => ruta.split('/themes/')[1])).toEqual([])
  })
})

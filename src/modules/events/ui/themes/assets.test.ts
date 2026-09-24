import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { THEME_ASSETS, themeAsset } from './assets'

describe('las imágenes de los temas', () => {
  it('todas las que el manifiesto declara están en disco', () => {
    // Esta es la guardia de la rebanada. Un `<img>` con la ruta cambiada no falla al
    // compilar ni en ninguna prueba de render: falla en el teléfono de un invitado, en
    // silencio, con un hueco donde iba la corona.
    const faltan: string[] = []
    for (const [tema, archivos] of Object.entries(THEME_ASSETS)) {
      for (const archivo of archivos) {
        const ruta = join(process.cwd(), 'public/temas', tema, archivo)
        if (!existsSync(ruta)) faltan.push(`${tema}/${archivo}`)
      }
    }
    expect(faltan).toEqual([])
  })

  it('ninguna quedó en un formato sin optimizar', () => {
    // Tal y como salen de la maqueta son exportaciones a tamaño de impresión: 148 MB para
    // algo que se mira en un teléfono. Un PNG aquí es una que se coló sin pasar por
    // `optimize-theme-assets.ts`.
    for (const archivos of Object.values(THEME_ASSETS)) {
      for (const archivo of archivos) {
        expect(archivo, archivo).toMatch(/\.(avif|webp|svg)$/)
      }
    }
  })

  it('no repite un archivo dentro del mismo tema', () => {
    for (const [tema, archivos] of Object.entries(THEME_ASSETS)) {
      expect(new Set(archivos).size, tema).toBe(archivos.length)
    }
  })

  it('compone la ruta pública', () => {
    expect(themeAsset('xv-valeria', 'tiara-vino-sf.avif')).toBe('/temas/xv-valeria/tiara-vino-sf.avif')
  })

  it('todo nombre es seguro en una URL', () => {
    // Un espacio o una mayúscula funciona en macOS, cuyo sistema de ficheros no distingue
    // mayúsculas, y da 404 en el contenedor. Es donde se descubre.
    for (const archivos of Object.values(THEME_ASSETS)) {
      for (const archivo of archivos) {
        expect(archivo, archivo).toMatch(/^[a-z0-9][a-z0-9-]*\.[a-z0-9]+$/)
      }
    }
  })
})

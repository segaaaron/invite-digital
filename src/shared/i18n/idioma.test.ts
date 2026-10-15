import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function fuentes(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return fuentes(ruta)
    return /\.tsx?$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : []
  })
}

describe('el idioma en cada lado', () => {
  // `useT()` lee un contexto de React: en un componente del servidor revienta al pintar, y el typecheck no lo ve.
  // En el servidor va `await tr()`; en lo que se pinta en los dos lados, `<T es en />`.
  it('solo los componentes del navegador usan useT()', () => {
    const raiz = join(__dirname, '..', '..')
    const mal = fuentes(raiz).filter((ruta) => {
      const texto = readFileSync(ruta, 'utf8')
      return /\buseT\(\)/.test(texto) && !texto.startsWith("'use client'")
    })
    expect(mal.map((ruta) => ruta.slice(raiz.length + 1))).toEqual([])
  })

  it('y await tr() no se usa en el navegador', () => {
    const raiz = join(__dirname, '..', '..')
    const mal = fuentes(raiz).filter((ruta) => {
      const texto = readFileSync(ruta, 'utf8')
      return texto.startsWith("'use client'") && /await tr\(\)/.test(texto)
    })
    expect(mal.map((ruta) => ruta.slice(raiz.length + 1))).toEqual([])
  })
})

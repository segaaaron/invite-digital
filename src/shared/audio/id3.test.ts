import { describe, expect, it } from 'vitest'
import { leerEtiquetasId3 } from './id3'

/** Una etiqueta ID3v2.3 mínima con los marcos dados, seguida del inicio de una trama. */
function id3(marcos: [string, number, number[]][]): Uint8Array {
  const cuerpo = marcos.flatMap(([id, codificacion, texto]) => {
    const talla = texto.length + 1
    return [...[...id].map((c) => c.charCodeAt(0)), talla >>> 24, (talla >>> 16) & 255, (talla >>> 8) & 255, talla & 255, 0, 0, codificacion, ...texto]
  })
  const n = cuerpo.length
  return new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, (n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127, ...cuerpo, 0xff, 0xfb])
}
const utf8 = (s: string) => [...new TextEncoder().encode(s)]

describe('leerEtiquetasId3', () => {
  it('lee título y artista en UTF-8, con tildes', () => {
    expect(leerEtiquetasId3(id3([['TIT2', 3, utf8('Canción de Valeria')], ['TPE1', 3, utf8('Cuarteto Andino')]]))).toEqual({
      titulo: 'Canción de Valeria',
      artista: 'Cuarteto Andino',
    })
  })

  it('lee UTF-16 con BOM, que es lo que escribe iTunes', () => {
    const texto = [0xff, 0xfe, ...[...'Tusa'].flatMap((c) => [c.charCodeAt(0), 0])]
    expect(leerEtiquetasId3(id3([['TIT2', 1, texto]]))).toEqual({ titulo: 'Tusa', artista: null })
  })

  it('sin etiqueta —un MP3 pelado o una M4A— devuelve vacío', () => {
    expect(leerEtiquetasId3(new Uint8Array([0xff, 0xfb, 0x90, 0, 1, 2, 3, 4, 5, 6, 7]))).toEqual({ titulo: null, artista: null })
  })
})

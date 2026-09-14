import type { EtiquetasDeCancion } from './audio'

/**
 * Lee título y artista de la etiqueta ID3v2 de un MP3, **en el navegador**, para rellenar el
 * formulario al elegir el archivo, antes de subirlo.
 *
 * Solo ID3v2.3 y 2.4, que es lo que traen casi todos los MP3, y solo los dos marcos que
 * importan: `TIT2` (título) y `TPE1` (artista). Basta con los primeros cientos de kilobytes
 * del fichero. Lo que no entienda —una M4A, un WAV, una etiqueta rara— devuelve vacío, y el
 * nombre sale del nombre del fichero; en el servidor `ffprobe` lo vuelve a leer igual.
 */
export function leerEtiquetasId3(bytes: Uint8Array): EtiquetasDeCancion {
  const vacio = { titulo: null, artista: null }
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return vacio
  const version = bytes[3]!
  if (version !== 3 && version !== 4) return vacio

  const sincro = (i: number) =>
    ((bytes[i]! & 0x7f) << 21) | ((bytes[i + 1]! & 0x7f) << 14) | ((bytes[i + 2]! & 0x7f) << 7) | (bytes[i + 3]! & 0x7f)
  const entero = (i: number) => ((bytes[i]! << 24) | (bytes[i + 1]! << 16) | (bytes[i + 2]! << 8) | bytes[i + 3]!) >>> 0
  const fin = Math.min(bytes.length, 10 + sincro(6))

  let titulo: string | null = null
  let artista: string | null = null
  let i = 10
  while (i + 10 <= fin) {
    const id = String.fromCharCode(bytes[i]!, bytes[i + 1]!, bytes[i + 2]!, bytes[i + 3]!)
    if (!/^[A-Z0-9]{4}$/.test(id)) break
    const talla = version === 4 ? sincro(i + 4) : entero(i + 4)
    const datos = bytes.subarray(i + 10, Math.min(fin, i + 10 + talla))
    if (id === 'TIT2') titulo = texto(datos)
    if (id === 'TPE1') artista = texto(datos)
    if (titulo !== null && artista !== null) break
    i += 10 + talla
  }
  return { titulo, artista }
}

const CODIFICACIONES = ['iso-8859-1', 'utf-16', 'utf-16be', 'utf-8'] as const

/** Un marco de texto: el primer byte dice la codificación; el texto acaba en el primer nulo. */
function texto(datos: Uint8Array): string | null {
  if (datos.length < 2) return null
  const etiqueta = CODIFICACIONES[datos[0]!]
  if (etiqueta === undefined) return null
  const nulo = String.fromCharCode(0)
  const valor = (new TextDecoder(etiqueta).decode(datos.subarray(1)).split(nulo)[0] ?? '').trim()
  return valor === '' ? null : valor
}

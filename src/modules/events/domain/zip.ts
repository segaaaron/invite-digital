/**
 * Un ZIP sin comprimir («store»), escrito a mano y en flujo, para que la pareja descargue **todas** las fotos
 * del álbum antes de que se borren con la invitación (documento del 6 nov).
 *
 * Sin compresión a propósito: las fotos ya son WebP, y comprimirlas otra vez gasta CPU del servidor para
 * ahorrar casi nada. Y sin dependencia: el formato, así de simple, son tres estructuras. Cada foto se lee,
 * se escribe y se suelta: en memoria solo hay una a la vez, no las mil.
 *
 * Límite conocido: sin ZIP64, así que no pasa de 65.535 ficheros ni de 4 GB. Un álbum de 1.500 fotos de
 * ~450 KB ronda los 700 MB.
 */

const TABLA = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

/** CRC-32 de un fichero (el de ZIP, PNG y gzip). `crc32("123456789")` es `0xCBF43926`. */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = TABLA[(c ^ b) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** La hora y la fecha en el formato de DOS, que es el que guarda un ZIP. */
function fechaDos(d: Date): { hora: number; fecha: number } {
  return {
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    fecha: ((Math.max(d.getFullYear(), 1980) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  }
}

const UTF8 = 0x0800

function cabeceraLocal(nombre: Uint8Array, crc: number, tamano: number, d: Date): Uint8Array {
  const out = new Uint8Array(30 + nombre.length)
  const v = new DataView(out.buffer)
  const { hora, fecha } = fechaDos(d)
  v.setUint32(0, 0x04034b50, true)
  v.setUint16(4, 20, true) // versión necesaria
  v.setUint16(6, UTF8, true)
  v.setUint16(8, 0, true) // método 0: sin comprimir
  v.setUint16(10, hora, true)
  v.setUint16(12, fecha, true)
  v.setUint32(14, crc, true)
  v.setUint32(18, tamano, true)
  v.setUint32(22, tamano, true)
  v.setUint16(26, nombre.length, true)
  v.setUint16(28, 0, true)
  out.set(nombre, 30)
  return out
}

function entradaDelDirectorio(nombre: Uint8Array, crc: number, tamano: number, desplazamiento: number, d: Date): Uint8Array {
  const out = new Uint8Array(46 + nombre.length)
  const v = new DataView(out.buffer)
  const { hora, fecha } = fechaDos(d)
  v.setUint32(0, 0x02014b50, true)
  v.setUint16(4, 20, true)
  v.setUint16(6, 20, true)
  v.setUint16(8, UTF8, true)
  v.setUint16(10, 0, true)
  v.setUint16(12, hora, true)
  v.setUint16(14, fecha, true)
  v.setUint32(16, crc, true)
  v.setUint32(20, tamano, true)
  v.setUint32(24, tamano, true)
  v.setUint16(28, nombre.length, true)
  v.setUint32(42, desplazamiento, true)
  out.set(nombre, 46)
  return out
}

function finDelDirectorio(entradas: number, tamano: number, desplazamiento: number): Uint8Array {
  const out = new Uint8Array(22)
  const v = new DataView(out.buffer)
  v.setUint32(0, 0x06054b50, true)
  v.setUint16(8, entradas, true)
  v.setUint16(10, entradas, true)
  v.setUint32(12, tamano, true)
  v.setUint32(16, desplazamiento, true)
  return out
}

export type EntradaDeZip = {
  readonly nombre: string
  /** Lee el fichero cuando le toca el turno. `null`: ya no existe, y se salta (el ZIP sigue siendo válido). */
  readonly leer: () => Promise<Uint8Array | null>
}

/**
 * El ZIP como flujo. `alOmitir` avisa de cada fichero que no se pudo leer: **un hueco en silencio sería una
 * descarga que parece completa y no lo es**, así que quien llama lo anota.
 */
export function zipEnFlujo(entradas: readonly EntradaDeZip[], alOmitir: (nombre: string, causa: unknown) => void, ahora: Date = new Date()): ReadableStream<Uint8Array> {
  const codificador = new TextEncoder()
  const directorio: Uint8Array[] = []
  let desplazamiento = 0
  let i = 0

  return new ReadableStream<Uint8Array>({
    async pull(control) {
      while (i < entradas.length) {
        const entrada = entradas[i]!
        i += 1
        let bytes: Uint8Array | null
        try {
          bytes = await entrada.leer()
        } catch (causa) {
          alOmitir(entrada.nombre, causa)
          continue
        }
        if (bytes === null) {
          alOmitir(entrada.nombre, 'el fichero ya no está')
          continue
        }
        const nombre = codificador.encode(entrada.nombre)
        const crc = crc32(bytes)
        const cabecera = cabeceraLocal(nombre, crc, bytes.byteLength, ahora)
        directorio.push(entradaDelDirectorio(nombre, crc, bytes.byteLength, desplazamiento, ahora))
        desplazamiento += cabecera.byteLength + bytes.byteLength
        control.enqueue(cabecera)
        control.enqueue(bytes)
        return
      }
      const tamano = directorio.reduce((suma, e) => suma + e.byteLength, 0)
      for (const e of directorio) control.enqueue(e)
      control.enqueue(finDelDirectorio(directorio.length, tamano, desplazamiento))
      control.close()
    },
  })
}

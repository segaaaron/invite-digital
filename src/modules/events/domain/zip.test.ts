import { describe, expect, it } from 'vitest'
import { crc32, zipEnFlujo } from './zip'

const leerTodo = async (flujo: ReadableStream<Uint8Array>): Promise<Uint8Array> => {
  const trozos: Uint8Array[] = []
  const lector = flujo.getReader()
  for (;;) {
    const { done, value } = await lector.read()
    if (done) break
    trozos.push(value)
  }
  const out = new Uint8Array(trozos.reduce((s, t) => s + t.byteLength, 0))
  let o = 0
  for (const t of trozos) {
    out.set(t, o)
    o += t.byteLength
  }
  return out
}

describe('zipEnFlujo', () => {
  it('el CRC-32 es el de la norma', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('escribe un ZIP que se puede leer por su directorio central: nombres, tamaños y contenido', async () => {
    const a = new TextEncoder().encode('primera foto')
    const b = new Uint8Array([1, 2, 3, 4, 5])
    const zip = await leerTodo(zipEnFlujo([{ nombre: 'foto-0001.webp', leer: async () => a }, { nombre: 'foto-0002.webp', leer: async () => b }], () => undefined))
    const v = new DataView(zip.buffer)

    // El fin del directorio: dos entradas.
    const fin = zip.byteLength - 22
    expect(v.getUint32(fin, true)).toBe(0x06054b50)
    expect(v.getUint16(fin + 10, true)).toBe(2)

    // Se recorre el directorio central, como hace `unzip`.
    let p = v.getUint32(fin + 16, true)
    const vistas: Array<{ nombre: string; contenido: Uint8Array; crc: number }> = []
    for (let n = 0; n < 2; n += 1) {
      expect(v.getUint32(p, true)).toBe(0x02014b50)
      const crc = v.getUint32(p + 16, true)
      const tam = v.getUint32(p + 20, true)
      const largo = v.getUint16(p + 28, true)
      const local = v.getUint32(p + 42, true)
      const nombre = new TextDecoder().decode(zip.slice(p + 46, p + 46 + largo))
      expect(v.getUint32(local, true)).toBe(0x04034b50)
      const inicio = local + 30 + v.getUint16(local + 26, true)
      vistas.push({ nombre, contenido: zip.slice(inicio, inicio + tam), crc })
      p += 46 + largo
    }
    expect(vistas.map((x) => x.nombre)).toEqual(['foto-0001.webp', 'foto-0002.webp'])
    expect(new TextDecoder().decode(vistas[0]!.contenido)).toBe('primera foto')
    expect([...vistas[1]!.contenido]).toEqual([1, 2, 3, 4, 5])
    for (const x of vistas) expect(crc32(x.contenido)).toBe(x.crc)
  })

  it('un fichero que no se puede leer se salta, se avisa y el ZIP sigue siendo válido', async () => {
    const omitidos: string[] = []
    const zip = await leerTodo(
      zipEnFlujo(
        [
          { nombre: 'rota.webp', leer: async () => Promise.reject(new Error('disco')) },
          { nombre: 'falta.webp', leer: async () => null },
          { nombre: 'buena.webp', leer: async () => new Uint8Array([9]) },
        ],
        (nombre) => omitidos.push(nombre),
      ),
    )
    expect(omitidos).toEqual(['rota.webp', 'falta.webp'])
    expect(new DataView(zip.buffer).getUint16(zip.byteLength - 22 + 10, true)).toBe(1)
  })
})

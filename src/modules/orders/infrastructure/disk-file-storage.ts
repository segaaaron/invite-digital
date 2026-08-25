import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FileStorage } from '../application/ports'

/**
 * Los comprobantes en disco, **fuera de `public/`**.
 *
 * Servirlos desde `public/` los publicaría en internet: el comprobante de una
 * transferencia lleva el nombre, el banco y el número de cuenta de una persona, y bastaría
 * con adivinar el nombre del fichero. Los sirve un route handler tras la sesión del
 * atelier.
 */
const CLAVE_VALIDA = /^[A-Za-z0-9_-]{1,64}$/

/**
 * La clave la acuña el servidor —es un UUID—, así que esta comprobación no debería
 * dispararse nunca. Está por lo que costaría que se disparase: una clave compuesta algún
 * día con algo del cliente escribiría donde quisiera.
 */
function rutaDe(raiz: string, key: string): string {
  if (!CLAVE_VALIDA.test(key)) throw new Error(`Clave de almacenamiento no admitida: ${key}`)
  return join(raiz, key)
}

export const createDiskFileStorage = (raiz: string): FileStorage => ({
  async put(key, bytes): Promise<void> {
    const ruta = rutaDe(raiz, key)
    await mkdir(raiz, { recursive: true })
    await writeFile(ruta, bytes)
  },

  async get(key): Promise<Uint8Array | null> {
    const ruta = rutaDe(raiz, key)
    try {
      return await readFile(ruta)
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw cause
    }
  },
})

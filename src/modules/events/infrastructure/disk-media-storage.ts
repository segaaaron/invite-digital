import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MediaStorage } from '../application/ports'

/**
 * Las imágenes de las invitaciones en disco, **fuera de `public/`**.
 *
 * Servirlas desde `public/` las publicaría en internet: son fotografías de la novia, de la
 * quinceañera y de sus familias, y bastaría con adivinar el nombre del fichero. Las
 * entrega `GET /media/[id]`, con la misma puerta de contraseña que la invitación.
 *
 * En producción es un **volumen**, no una carpeta de la imagen: dentro de la imagen, cada
 * despliegue borraría las fotos de todas las bodas en curso. Misma decisión que
 * `ORDERS_DIR`.
 */
const CLAVE_VALIDA = /^[0-9a-f-]{36}\.[a-z0-9]{1,5}$/

/**
 * La clave la acuña el servidor —es el identificador de la fila más su extensión—, así que
 * esta comprobación no debería dispararse nunca. Está por lo que costaría que se
 * disparase: una clave compuesta algún día con algo del cliente leería o escribiría donde
 * quisiera.
 */
function rutaDe(raiz: string, key: string): string {
  if (!CLAVE_VALIDA.test(key)) throw new Error(`Clave de almacenamiento no admitida: ${key}`)
  return join(raiz, key)
}

export const createDiskMediaStorage = (raiz: string): MediaStorage => ({
  async put(key, bytes): Promise<void> {
    await mkdir(raiz, { recursive: true })
    await writeFile(rutaDe(raiz, key), bytes)
  },

  async get(key): Promise<Uint8Array | null> {
    try {
      return await readFile(rutaDe(raiz, key))
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw cause
    }
  },

  /** Borrar lo que ya no está no es un fallo: la retención puede pasar dos veces. */
  async remove(key): Promise<void> {
    await rm(rutaDe(raiz, key), { force: true })
  },
})

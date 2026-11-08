import { AwsClient } from 'aws4fetch'
import type { MediaStorage } from '../application/ports'

export type OpcionesDeR2 = {
  /** `https://<cuenta>.r2.cloudflarestorage.com` (o cualquier almacén compatible con S3). */
  readonly endpoint: string
  readonly bucket: string
  readonly keyId: string
  readonly secret: string
}

const CLAVE_VALIDA = /^[0-9a-f-]{36}\.[a-z0-9]{1,5}$/

/**
 * Las fotos del álbum **fuera del disco del VPS** (documento del 6 nov: «guardadas fuera del disco, por
 * ejemplo en Cloudflare R2»). R2 habla S3: basta firmar la petición, sin SDK. Las fotos de un álbum de
 * mil invitados son el volumen que más crece, y es el que no debe llenar el disco del servidor.
 *
 * Misma regla de claves que el disco: la acuña el servidor (UUID + extensión) y se comprueba antes de
 * armar la dirección, para que nada del cliente llegue a la URL.
 *
 * Los fallos **lanzan**: quien llama (`saveMedia`) los convierte en `storage_failure` y los anota. Un `get` que
 * no encuentra devuelve `null`, y un `remove` de lo que ya no está no es un fallo (la retención puede pasar
 * dos veces).
 */
export function createR2MediaStorage(o: OpcionesDeR2): MediaStorage {
  const cliente = new AwsClient({ accessKeyId: o.keyId, secretAccessKey: o.secret, service: 's3', region: 'auto', retries: 2 })
  const url = (key: string): string => {
    if (!CLAVE_VALIDA.test(key)) throw new Error(`Clave de almacenamiento no admitida: ${key}`)
    return `${o.endpoint.replace(/\/+$/, '')}/${o.bucket}/${key}`
  }
  return {
    async put(key, bytes): Promise<void> {
      const r = await cliente.fetch(url(key), { method: 'PUT', body: bytes as BodyInit })
      if (!r.ok) throw new Error(`R2 rechazó guardar ${key}: ${String(r.status)}`)
    },
    async get(key): Promise<Uint8Array | null> {
      const r = await cliente.fetch(url(key), { method: 'GET' })
      if (r.status === 404) return null
      if (!r.ok) throw new Error(`R2 rechazó leer ${key}: ${String(r.status)}`)
      return new Uint8Array(await r.arrayBuffer())
    },
    async remove(key): Promise<void> {
      const r = await cliente.fetch(url(key), { method: 'DELETE' })
      if (!r.ok && r.status !== 404) throw new Error(`R2 rechazó borrar ${key}: ${String(r.status)}`)
    },
  }
}

/**
 * El álbum con respaldo: **escribe en el principal (R2)** y **lee de los dos**. Sin esto, activar R2 con
 * fotos ya subidas al disco las dejaría sin servir; con esto siguen donde estaban y las nuevas van fuera.
 * Borrar toca los dos, que es idempotente.
 */
export function conRespaldo(principal: MediaStorage, respaldo: MediaStorage): MediaStorage {
  return {
    put: (key, bytes) => principal.put(key, bytes),
    get: async (key) => (await principal.get(key)) ?? (await respaldo.get(key)),
    remove: async (key) => {
      await principal.remove(key)
      await respaldo.remove(key)
    },
  }
}

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FileStore } from '../application/ports'

/**
 * Dónde vive la música de los modelos del escaparate.
 *
 * **Almacén propio, no el de los comprobantes.** Comparten la idea —ficheros fuera de
 * `public/`, en un volumen— y no el propósito: un comprobante lleva el nombre y la cuenta
 * de un cliente y se barre cuando el pedido vence; esto es la música de la web pública y
 * dura lo que dure el modelo. Mezclarlos significaría que una limpieza de comprobantes
 * pueda llevarse por delante las canciones del catálogo.
 *
 * En producción es un **volumen**. Dentro de la imagen, cada despliegue borraría las
 * dieciséis canciones sin que nadie se entere hasta que alguien abra un modelo.
 */
const CLAVE_VALIDA = /^[A-Za-z0-9._-]{1,128}$/

function rutaDe(raiz: string, key: string): string {
  // La clave la componemos nosotros —`<uuid>.mp3`—, pero esto es lo que impide que un
  // día un `..` colado por otro camino escriba fuera de la carpeta.
  if (!CLAVE_VALIDA.test(key)) throw new Error(`Clave de almacenamiento no admitida: ${key}`)
  return join(raiz, key)
}

export const createDiskShowcaseStorage = (raiz: string): FileStore => ({
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

  /** `force`: borrar lo que ya no está no es un fallo, y aquí se repite al reemplazar. */
  async remove(key): Promise<void> {
    await rm(rutaDe(raiz, key), { force: true })
  },
})

import { MAX_MEDIA_BYTES, type MediaType, mediaTypeOf, storageKeyFor } from '../domain/media'
import type { ImageProcessor, MediaRepository, MediaStorage } from './ports'

export type MediaError = 'too_large' | 'unsupported_type' | 'storage_failure'

type Deps = { media: MediaRepository; storage: MediaStorage; images: ImageProcessor; ids: () => string }

/**
 * Guarda una imagen de la invitación.
 *
 * El orden importa y es el mismo que el de los comprobantes:
 *
 * 1. **El tamaño primero**, antes de leer el fichero a memoria. Un `arrayBuffer()` de un
 *    archivo de dos gigas se los trae enteros al servidor antes de que nadie lo rechace.
 * 2. **El tipo por los primeros bytes**, nunca por la extensión ni por el `Content-Type`:
 *    los dos los escribe quien sube el fichero.
 * 3. **La imagen se reencoda antes de guardarse.** Una fotografía de móvil ronda los
 *    cuatro megabytes y se servía entera a un invitado con datos; ahora lo que llega al
 *    disco es ya lo que se va a servir, no hay una versión pesada esperando a que alguien
 *    la pida. De paso se le quitan los metadatos —una foto de la novia lleva dentro dónde
 *    y cuándo se tomó— y deja de haber bytes ajenos a la imagen dentro del fichero.
 * 4. El fichero al disco con nombre de identificador, y **solo después** la fila. Al
 *    revés, un fallo de disco dejaría una fila apuntando a una imagen que no existe, y la
 *    invitación pintaría un hueco roto.
 */
export const saveMedia =
  ({ media, storage, images, ids }: Deps) =>
  async (
    eventId: string,
    archivo: { size: number; name: string; bytes: () => Promise<Uint8Array> },
  ): Promise<{ ok: true; id: string } | { ok: false; error: MediaError }> => {
    if (archivo.size > MAX_MEDIA_BYTES) return { ok: false, error: 'too_large' }

    const bytes = await archivo.bytes()
    if (mediaTypeOf(bytes) === null) return { ok: false, error: 'unsupported_type' }

    // Los primeros bytes dicen que **parece** una imagen; que lo sea lo dice que se pueda
    // decodificar. Una cabecera correcta con un cuerpo que no lo es pasa la primera
    // comprobación y no pasa esta.
    const listo = await images.normalize(bytes)
    if (listo === null) return { ok: false, error: 'unsupported_type' }

    const id = ids()
    try {
      await storage.put(storageKeyFor(id, listo.contentType), listo.bytes)
      await media.insert({
        id,
        eventId,
        contentType: listo.contentType,
        originalName: archivo.name.trim().slice(0, 255) || 'imagen',
        byteSize: listo.bytes.byteLength,
      })
    } catch (cause) {
      console.error('No se pudo guardar la imagen del evento %s:', eventId, cause)
      return { ok: false, error: 'storage_failure' }
    }

    return { ok: true, id }
  }

/** Lee una imagen por su identificador. Devuelve también a qué evento pertenece. */
export const readMedia =
  ({ media, storage }: Deps) =>
  async (id: string): Promise<{ eventId: string; contentType: MediaType; bytes: Uint8Array } | null> => {
    const fila = await media.find(id)
    if (fila === null) return null
    const bytes = await storage.get(storageKeyFor(fila.id, fila.contentType as MediaType))
    if (bytes === null) return null
    return { eventId: fila.eventId, contentType: fila.contentType as MediaType, bytes }
  }

/** Las imágenes de un evento, para la pantalla del panel. */
export const listMedia = ({ media }: Deps) => (eventId: string) => media.listByEvent(eventId)

/**
 * Borra las imágenes de un evento, del disco y de la base.
 *
 * Lo llama la retención. Borra primero el fichero: si falla, la fila se queda y el próximo
 * pase lo vuelve a intentar. Al revés se perdería el rastro de qué había que borrar.
 */
export const purgeMedia =
  ({ media, storage }: Deps) =>
  async (eventId: string): Promise<number> => {
    const filas = await media.listByEvent(eventId)
    for (const fila of filas) {
      await storage.remove(storageKeyFor(fila.id, fila.contentType as MediaType))
      await media.remove(fila.id)
    }
    return filas.length
  }

import { MAX_AUDIO_UPLOAD_BYTES, type AudioProcessor, nombreDeCancion } from '@/shared/audio/audio'
import { ALBUM_IMAGE_EDGE, MAX_GUEST_PHOTOS, MAX_MEDIA_BYTES, type MediaType, esAudio, mediaTypeOf, storageKeyFor } from '../domain/media'
import type { ImageProcessor, MediaRepository, MediaStorage } from './ports'
import { registrarFallo } from '@/shared/observability/fallos'

export type MediaError = 'too_large' | 'unsupported_type' | 'storage_failure' | 'too_many' | 'photo_limit' | 'album_full'

type Deps = {
  media: MediaRepository
  storage: MediaStorage
  /**
   * Dónde van las fotos de **los invitados** (el álbum), si no es el disco: Cloudflare R2, con el disco de respaldo
   * para lo ya subido. Sin él, todo va a `storage`, que es como fue siempre.
   */
  album?: MediaStorage
  images: ImageProcessor
  audio: AudioProcessor
  ids: () => string
}

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
  ({ media, storage: disco, album, images, audio, ids }: Deps) =>
  async (
    eventId: string,
    archivo: { size: number; name: string; bytes: () => Promise<Uint8Array> },
    /** Qué grupo la sube. Sin esto la sube el atelier, que es el caso de siempre. */
    uploadedByGroupId: string | null = null,
    /**
     * Si este camino admite audio. **El del invitado no**, y es una defensa, no una
     * preferencia: el `accept` del formulario se cambia desde el navegador en dos
     * segundos, y como subir audio **reemplaza** la canción del evento, un invitado
     * podría dejar sin música la boda de otro.
     */
    {
      permitirAudio = true,
      maxFotos = null,
      lado,
    }: {
      permitirAudio?: boolean
      /**
       * Fotos del evento que admite el plan, sin contar las de los invitados —esas tienen su
       * tope por grupo— ni la canción. `null` es sin límite.
       */
      maxFotos?: number | null
      /** Lado largo máximo de la imagen. Las del álbum van a 2048; sin decirlo, el de la invitación. */
      lado?: number
    } = {},
  ): Promise<{ ok: true; id: string; contentType: MediaType; cancion?: { track: string; artist: string } } | { ok: false; error: MediaError }> => {
    // El tope de la puerta es el de la música, que es el mayor: una canción en WAV ronda los
    // 30 MB. Sin audio —el invitado— el tope es el de las fotografías desde el principio.
    if (archivo.size > (permitirAudio ? MAX_AUDIO_UPLOAD_BYTES : MAX_MEDIA_BYTES)) return { ok: false, error: 'too_large' }

    const bytes = await archivo.bytes()
    const tipo = mediaTypeOf(bytes)

    let listo: { bytes: Uint8Array; contentType: MediaType } | null
    let cancion: { track: string; artist: string } | undefined
    if (tipo !== null && !esAudio(tipo)) {
      if (archivo.size > MAX_MEDIA_BYTES) return { ok: false, error: 'too_large' }
      if (maxFotos !== null) {
        const fotos = (await media.listByEvent(eventId)).filter(
          (fila) => fila.uploadedByGroupId === null && !esAudio(fila.contentType as MediaType),
        )
        if (fotos.length >= maxFotos) return { ok: false, error: 'photo_limit' }
      }
      // Los primeros bytes dicen que **parece** una imagen; que lo sea lo dice que se pueda
      // decodificar. Una cabecera correcta con un cuerpo que no lo es no pasa de aquí.
      listo = await images.normalize(bytes, lado)
    } else {
      if (!permitirAudio) return { ok: false, error: 'unsupported_type' }
      // **La música se ajusta sola**, sea el formato que sea: quien sube la canción no tiene
      // por qué saber recortarla ni comprimirla. Lo que no sea un audio legible —un PDF, un
      // fichero roto— lo rechaza `ffmpeg` y vuelve `null`.
      const ajustado = await audio.normalize(bytes)
      listo = ajustado === null ? null : { bytes: ajustado.mp3, contentType: 'audio/mpeg' }
      if (ajustado !== null) cancion = nombreDeCancion(ajustado, archivo.name)
    }
    if (listo === null) return { ok: false, error: 'unsupported_type' }

    const id = ids()
    // Las fotos de invitados van al almacén del álbum; lo del atelier (invitación, canción), al disco.
    const storage = uploadedByGroupId !== null && album !== undefined ? album : disco
    try {
      await storage.put(storageKeyFor(id, listo.contentType), listo.bytes)
      await media.insert({
        id,
        eventId,
        contentType: listo.contentType,
        originalName: archivo.name.trim().slice(0, 255) || (esAudio(listo.contentType) ? 'audio' : 'imagen'),
        byteSize: listo.bytes.byteLength,
        uploadedByGroupId,
      })

      /**
       * **Una boda tiene UNA canción.** Subir otra reemplaza la anterior: se borra su fila
       * y su fichero.
       *
       * Sin esto, cada cambio de canción dejaba un MP3 muerto en el volumen y una opción
       * más en el selector, todas con nombres parecidos — y ahí es donde se elige la
       * equivocada sin que nada lo diga.
       *
       * Va **después** de escribir la nueva, nunca antes: si falla el borrado, lo que
       * queda es un fichero de más, no una invitación apuntando a una canción que ya no
       * existe. Y las fotografías no entran aquí: de esas una boda tiene muchas.
       */
      if (esAudio(listo.contentType)) {
        for (const fila of await media.listByEvent(eventId)) {
          if (fila.id === id || !esAudio(fila.contentType as MediaType)) continue
          await disco.remove(storageKeyFor(fila.id, fila.contentType as MediaType))
          await media.remove(fila.id)
        }
      }
    } catch (cause) {
      registrarFallo('events/media-use-cases', 'No se pudo guardar el archivo del evento %s:', eventId, cause)
      // Si el fichero llegó a escribirse y la fila no, se borra: sin fila, ninguna retención lo encontraría.
      await storage.remove(storageKeyFor(id, listo.contentType)).catch((resto: unknown) => {
        registrarFallo('events/media-use-cases', 'No se pudo retirar el fichero huérfano %s:', id, resto)
      })
      return { ok: false, error: 'storage_failure' }
    }

    return { ok: true, id, contentType: listo.contentType, ...(cancion === undefined ? {} : { cancion }) }
  }

/** Lee una imagen por su identificador. Devuelve también a qué evento pertenece. */
export const readMedia =
  ({ media, storage, album }: Deps) =>
  async (id: string): Promise<{ eventId: string; contentType: MediaType; bytes: Uint8Array; uploadedByGroupId: string | null } | null> => {
    const fila = await media.find(id)
    if (fila === null) return null
    let bytes: Uint8Array | null
    try {
      bytes = await (fila.uploadedByGroupId !== null && album !== undefined ? album : storage).get(storageKeyFor(fila.id, fila.contentType as MediaType))
    } catch (cause) {
      registrarFallo('events/media-use-cases', 'No se pudo leer el archivo %s del almacén:', id, cause)
      return null
    }
    if (bytes === null) {
      // La fila existe y el fichero no: es una pérdida, no una foto que nunca estuvo.
      registrarFallo('events/media-use-cases', 'El archivo %s tiene fila pero no está en el almacén.', id)
      return null
    }
    // `uploadedByGroupId` sale también: quien lo use para decidir algo que ven todos los invitados
    // —el QR del banco— necesita saber si la imagen la subió el anfitrión o un invitado cualquiera.
    return { eventId: fila.eventId, contentType: fila.contentType as MediaType, bytes, uploadedByGroupId: fila.uploadedByGroupId }
  }

/** Las imágenes de un evento, para la pantalla del panel. */
export const listMedia = ({ media }: Deps) => (eventId: string) => media.listByEvent(eventId)

/**
 * Quita un archivo del evento.
 *
 * `enUso` son los identificadores que el contenido pinta: quitar uno de esos dejaría un
 * hueco roto en la invitación, así que primero se cambia en su bloque. El fichero se borra
 * antes que la fila, como en la retención: si falla, la fila sigue y se puede reintentar.
 */
export const removeMedia =
  ({ media, storage, album }: Deps) =>
  async (
    eventId: string,
    id: string,
    enUso: readonly string[],
  ): Promise<{ ok: true } | { ok: false; error: 'not_found' | 'in_use' | 'storage_failure' }> => {
    const fila = await media.find(id)
    if (fila === null || fila.eventId !== eventId) return { ok: false, error: 'not_found' }
    if (enUso.includes(id)) return { ok: false, error: 'in_use' }
    try {
      await (fila.uploadedByGroupId !== null && album !== undefined ? album : storage).remove(storageKeyFor(fila.id, fila.contentType as MediaType))
      await media.remove(fila.id)
    } catch (cause) {
      registrarFallo('events/media-use-cases', 'No se pudo quitar el archivo %s del evento %s:', id, eventId, cause)
      return { ok: false, error: 'storage_failure' }
    }
    return { ok: true }
  }

/**
 * Borra las imágenes de un evento, del disco y de la base.
 *
 * Lo llama la retención. Borra primero el fichero: si falla, la fila se queda y el próximo
 * pase lo vuelve a intentar. Al revés se perdería el rastro de qué había que borrar.
 */
export const purgeMedia =
  ({ media, storage, album }: Deps) =>
  async (eventId: string): Promise<number> => {
    const filas = await media.listByEvent(eventId)
    for (const fila of filas) {
      await (fila.uploadedByGroupId !== null && album !== undefined ? album : storage).remove(storageKeyFor(fila.id, fila.contentType as MediaType))
      await media.remove(fila.id)
    }
    return filas.length
  }

/**
 * La fotografía que sube **un invitado** desde su invitación.
 *
 * Es `saveMedia` con el tope por grupo delante, y el tope va aquí y no en la pantalla
 * porque la pantalla es cortesía: la acción es un extremo HTTP público que se autoriza con
 * el token del enlace, y ese enlace circula por WhatsApp.
 *
 * La procedencia se guarda —`uploadedByGroupId`— para dos cosas: contar, y que el atelier
 * distinga en su bandeja lo que trajeron los invitados de lo que subió él.
 */
export const saveGuestPhoto =
  (deps: Deps) =>
  async (
    eventId: string,
    groupId: string,
    archivo: { size: number; name: string; bytes: () => Promise<Uint8Array> },
    /** Cuántas fotos de invitados caben en **todo el evento** (1.000 con el plan, 500 si se compró; +500 por extra). */
    topeDelAlbum: number,
  ): Promise<{ ok: true; id: string } | { ok: false; error: MediaError }> => {
    const ya = await deps.media.countByGroup(groupId)
    if (ya >= MAX_GUEST_PHOTOS) return { ok: false, error: 'too_many' }
    // **El tope del álbum**, además del de cada invitado: sin él, 50 invitados con 20 fotos son 1.000 y el
    // disco lo paga el atelier. Cuenta solo lo que subieron invitados (la galería del atelier no entra).
    const enElAlbum = (await deps.media.listByEvent(eventId)).filter((fila) => fila.uploadedByGroupId !== null).length
    if (enElAlbum >= topeDelAlbum) return { ok: false, error: 'album_full' }
    // **Fotografías y nada más.** Este extremo se autoriza con el token del enlace, que
    // circula por WhatsApp; admitir audio aquí dejaría que cualquiera con ese enlace
    // reemplazara la canción de la boda.
    return saveMedia(deps)(eventId, archivo, groupId, { permitirAudio: false, lado: ALBUM_IMAGE_EDGE })
  }

/** Lo que este grupo lleva subido, para que el invitado vea sus propias fotografías. */
export const listGuestPhotos = ({ media }: Deps) => (groupId: string) => media.listByGroup(groupId)

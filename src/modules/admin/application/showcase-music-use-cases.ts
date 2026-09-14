import type { Actor } from '@/modules/identity/domain/access'
import { MAX_AUDIO_UPLOAD_BYTES, nombreDeCancion, type AudioProcessor } from '@/shared/audio/audio'
import { attempt, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from '../domain/errors'
import {
  leerNombreDeCancion,
  showcaseMusicKey,
  showcaseSongKey,
  SHOWCASE_MUSIC_PREFIX,
  SHOWCASE_SONG_PREFIX,
  themeOfShowcaseKey,
} from '../domain/showcase-music'
import type { AdminRepository, FileStore, SettingsRepository } from './ports'

type Deps = { settings: SettingsRepository; storage: FileStore }

/**
 * Qué modelos del escaparate tienen música, y con qué fichero.
 *
 * Devuelve el mapa entero —clave de tema → fichero— en **una sola lectura**. La pantalla
 * del admin pinta los dieciséis y el escaparate pregunta por uno; dieciséis consultas para
 * dibujar una tabla sería pagar por columna.
 */
export const readShowcaseMusic =
  (deps: Deps) =>
  async (): Promise<Result<Record<string, string>, AdminError>> =>
    attempt(
      async () => {
        const filas = await deps.settings.readAll()
        const salida: Record<string, string> = {}

        for (const [clave, valor] of Object.entries(filas)) {
          if (!clave.startsWith(SHOWCASE_MUSIC_PREFIX) || valor === '') continue
          const tema = themeOfShowcaseKey(clave)
          if (tema !== null) salida[tema] = valor
        }

        return ok(salida)
      },
      (cause) => adminError('storage_failure', `No se pudo leer la música del escaparate: ${String(cause)}`),
    )

/**
 * El nombre de la canción de cada modelo, sacado del archivo al subirlo, en una lectura.
 * Si la base falla devuelve vacío: el nombre es un adorno y el modelo sigue sonando.
 */
export const readShowcaseSongs =
  (deps: Deps) =>
  async (): Promise<Record<string, { track: string; artist: string }>> => {
    try {
      const filas = await deps.settings.readAll()
      const salida: Record<string, { track: string; artist: string }> = {}
      for (const [clave, valor] of Object.entries(filas)) {
        if (!clave.startsWith(SHOWCASE_SONG_PREFIX)) continue
        const nombre = leerNombreDeCancion(valor)
        const tema = clave.slice(SHOWCASE_SONG_PREFIX.length)
        if (nombre !== null && showcaseSongKey(tema) !== null) salida[tema] = nombre
      }
      return salida
    } catch {
      return {}
    }
  }

/**
 * Guarda el MP3 de un modelo.
 *
 * El orden es el de siempre y no es decorativo:
 *
 * 1. **La clave del tema primero.** Acaba dentro de `app_settings.key`; sin este corte,
 *    quien controle ese valor escribe en cualquier otra fila —la cuenta bancaria, por
 *    ejemplo—. Hay prueba.
 * 2. **El tamaño**, antes de mirar nada más.
 * 3. **El audio se ajusta solo**: `ffmpeg` lo convierte en un MP3 ligero y lo recorta, sea
 *    el formato que sea. Lo que no es un audio legible vuelve `null` y se rechaza.
 * 4. **El fichero al disco y solo después la fila.** Al revés, un fallo de disco dejaría
 *    un ajuste apuntando a un audio que no existe y el escaparate serviría un 404.
 * 5. **El anterior se borra.** Reemplazar la canción de un modelo diez veces dejaría diez
 *    ficheros muertos en el volumen, y nadie sabría cuáles sobran.
 */
export const saveShowcaseMusic =
  (deps: Deps & { admin: AdminRepository; audio: AudioProcessor; newKey: () => string }) =>
  async (
    actor: Actor,
    input: {
      themeKey: string
      bytes: Uint8Array
      nombreArchivo: string
      /** El nombre que escribe el admin. Vacío, se saca del archivo. */
      nombre?: { track: string; artist: string }
    },
  ): Promise<Result<null, AdminError>> => {
    const fila = showcaseMusicKey(input.themeKey)
    if (fila === null) return { ok: false, error: adminError('invalid_input', 'Ese modelo no existe.') }

    if (input.bytes.byteLength > MAX_AUDIO_UPLOAD_BYTES) {
      return { ok: false, error: adminError('invalid_input', 'La canción pasa de 30 MB.') }
    }

    const ajustado = await deps.audio.normalize(input.bytes)
    if (ajustado === null) {
      return { ok: false, error: adminError('invalid_input', 'Ese archivo no es una canción que podamos leer.') }
    }

    return attempt(
      async () => {
        const anterior = (await deps.settings.readAll())[fila] ?? null

        const key = deps.newKey()
        await deps.storage.put(`${key}.mp3`, ajustado.mp3)
        // El fichero y su nombre en la misma escritura: el reproductor dice la canción que
        // suena, no la del contenido de muestra del modelo.
        await deps.settings.write({
          [fila]: `${key}.mp3`,
          [`${showcaseSongKey(input.themeKey)}`]: JSON.stringify(
            nombreValido(input.nombre) ?? nombreDeCancion(ajustado, input.nombreArchivo),
          ),
        })

        // Después de escribir la fila, nunca antes: si falla el borrado, lo que queda es un
        // fichero de más —molesto— y no una canción que ya nadie puede servir.
        if (anterior !== null && anterior !== '') await deps.storage.remove(anterior)

        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: 'escaparate.musica',
          subject: input.themeKey,
        })

        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudo guardar la música del modelo: ${String(cause)}`),
    )
  }

/**
 * Cambia el nombre que dice el reproductor de un modelo, sin volver a subir la canción.
 * Solo si ese modelo tiene música: un nombre sin canción anunciaría algo que no suena.
 */
export const renameShowcaseSong =
  (deps: Deps & { admin: AdminRepository }) =>
  async (actor: Actor, themeKey: string, nombre: { track: string; artist: string }): Promise<Result<null, AdminError>> => {
    const fila = showcaseSongKey(themeKey)
    const filaMusica = showcaseMusicKey(themeKey)
    if (fila === null || filaMusica === null) return { ok: false, error: adminError('invalid_input', 'Ese modelo no existe.') }
    const limpio = nombreValido(nombre)
    if (limpio === null) return { ok: false, error: adminError('invalid_input', 'Escribe el nombre de la canción.') }

    return attempt(
      async () => {
        if (((await deps.settings.readAll())[filaMusica] ?? '') === '') {
          return { ok: false, error: adminError('invalid_input', 'Primero sube la canción de este modelo.') }
        }
        await deps.settings.write({ [fila]: JSON.stringify(limpio) })
        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: 'escaparate.musica.nombre',
          subject: themeKey,
          detail: limpio.artist === '' ? limpio.track : `${limpio.track} · ${limpio.artist}`,
        })
        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudo guardar el nombre de la canción: ${String(cause)}`),
    )
  }

/** El nombre escrito, recortado; `null` si no hay título. */
function nombreValido(nombre: { track: string; artist: string } | undefined): { track: string; artist: string } | null {
  if (nombre === undefined) return null
  const track = nombre.track.replace(/\s+/g, ' ').trim().slice(0, 120)
  const artist = nombre.artist.replace(/\s+/g, ' ').trim().slice(0, 120)
  return track === '' ? null : { track, artist }
}

/**
 * Quita la música de un modelo: vuelve a quedarse mudo, como nació.
 *
 * Se escribe la cadena vacía en vez de borrar la fila porque el repositorio de ajustes solo
 * sabe escribir; y `readShowcaseMusic` ya trata el vacío como «sin música», así que el
 * resultado es el mismo y no hace falta otro método en el puerto.
 */
export const removeShowcaseMusic =
  (deps: Deps & { admin: AdminRepository }) =>
  async (actor: Actor, themeKey: string): Promise<Result<null, AdminError>> => {
    const fila = showcaseMusicKey(themeKey)
    if (fila === null) return { ok: false, error: adminError('invalid_input', 'Ese modelo no existe.') }

    return attempt(
      async () => {
        const anterior = (await deps.settings.readAll())[fila] ?? null
        await deps.settings.write({ [fila]: '', [`${showcaseSongKey(themeKey)}`]: '' })
        if (anterior !== null && anterior !== '') await deps.storage.remove(anterior)

        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: 'escaparate.musica.quitar',
          subject: themeKey,
        })

        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudo quitar la música del modelo: ${String(cause)}`),
    )
  }

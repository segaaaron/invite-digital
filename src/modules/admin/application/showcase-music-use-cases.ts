import type { Actor } from '@/modules/identity/domain/access'
import { attempt, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from '../domain/errors'
import {
  esMp3,
  MAX_SHOWCASE_MUSIC_BYTES,
  showcaseMusicKey,
  SHOWCASE_MUSIC_PREFIX,
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
 * Guarda el MP3 de un modelo.
 *
 * El orden es el de siempre y no es decorativo:
 *
 * 1. **La clave del tema primero.** Acaba dentro de `app_settings.key`; sin este corte,
 *    quien controle ese valor escribe en cualquier otra fila —la cuenta bancaria, por
 *    ejemplo—. Hay prueba.
 * 2. **El tamaño**, antes de mirar nada más.
 * 3. **El tipo por los primeros bytes**, nunca por la extensión ni por el `Content-Type`:
 *    los dos los escribe quien sube el fichero.
 * 4. **El fichero al disco y solo después la fila.** Al revés, un fallo de disco dejaría
 *    un ajuste apuntando a un audio que no existe y el escaparate serviría un 404.
 * 5. **El anterior se borra.** Reemplazar la canción de un modelo diez veces dejaría diez
 *    ficheros muertos en el volumen, y nadie sabría cuáles sobran.
 */
export const saveShowcaseMusic =
  (deps: Deps & { admin: AdminRepository; newKey: () => string }) =>
  async (
    actor: Actor,
    input: { themeKey: string; bytes: Uint8Array },
  ): Promise<Result<null, AdminError>> => {
    const fila = showcaseMusicKey(input.themeKey)
    if (fila === null) return { ok: false, error: adminError('invalid_input', 'Ese modelo no existe.') }

    if (input.bytes.byteLength > MAX_SHOWCASE_MUSIC_BYTES) {
      return {
        ok: false,
        error: adminError('invalid_input', 'El MP3 pasa de 3 MB. Súbelo recortado, de 30 a 60 segundos.'),
      }
    }

    if (!esMp3(input.bytes)) {
      return { ok: false, error: adminError('invalid_input', 'Ese archivo no es un MP3.') }
    }

    return attempt(
      async () => {
        const anterior = (await deps.settings.readAll())[fila] ?? null

        const key = deps.newKey()
        await deps.storage.put(`${key}.mp3`, input.bytes)
        await deps.settings.write({ [fila]: `${key}.mp3` })

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
        await deps.settings.write({ [fila]: '' })
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

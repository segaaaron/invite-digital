/**
 * La música de los modelos del escaparate: lo que suena en `/modelos/<idioma>/<clave>`.
 *
 * **Es del admin y no de cada boda.** Lo que suena en una invitación de verdad vive en
 * `event_media`, pertenece a ese evento y lo sube su atelier o su cliente. Esto otro es la
 * web pública: los dieciséis modelos que cualquiera mira antes de comprar, y de esos
 * responde una sola persona.
 *
 * Vive en `app_settings` por el mismo motivo que los datos de cobro: cambiar la canción de
 * un modelo es una decisión comercial y no puede exigir un despliegue.
 *
 * Módulo puro: ni disco, ni base. Mira bytes y compone claves.
 */

/**
 * Qué claves de tema se admiten al componer la fila de ajustes.
 *
 * La clave acaba dentro de `app_settings.key`, así que sin esto quien controlara ese valor
 * escribiría en **cualquier** fila de ajustes —`payment.accountNumber`, por ejemplo—. No
 * basta con que el registro de temas la conozca: eso se comprueba arriba, y esta es la
 * última línea antes de escribir.
 */
const CLAVE_DE_TEMA = /^[a-z0-9-]{1,40}$/

/** El prefijo de todas estas filas, para poder leerlas de una pasada. */
export const SHOWCASE_MUSIC_PREFIX = 'showcase.music.'

/**
 * La fila donde vive la música de un modelo, o `null` si la clave no es admisible.
 *
 * Devuelve `null` en vez de lanzar porque quien llama ya tiene un camino para «esto no
 * vale»: es una entrada de formulario, no una avería.
 */
export function showcaseMusicKey(themeKey: string): string | null {
  return CLAVE_DE_TEMA.test(themeKey) ? `${SHOWCASE_MUSIC_PREFIX}${themeKey}` : null
}

/**
 * La fila con el nombre que enseña el reproductor del modelo: `{"track","artist"}` en JSON.
 *
 * Aparte de la del fichero, y con otro prefijo, para que `readShowcaseMusic` —que recorre
 * `showcase.music.*`— no la confunda con un archivo.
 */
export const SHOWCASE_SONG_PREFIX = 'showcase.song.'

export function showcaseSongKey(themeKey: string): string | null {
  return CLAVE_DE_TEMA.test(themeKey) ? `${SHOWCASE_SONG_PREFIX}${themeKey}` : null
}

/** El nombre guardado, o `null` si no hay o no tiene la forma esperada. */
export function leerNombreDeCancion(crudo: string | undefined): { track: string; artist: string } | null {
  if (crudo === undefined || crudo === '') return null
  try {
    const valor = JSON.parse(crudo) as { track?: unknown; artist?: unknown }
    if (typeof valor.track !== 'string' || valor.track === '') return null
    return { track: valor.track, artist: typeof valor.artist === 'string' ? valor.artist : '' }
  } catch {
    return null
  }
}

/** De la fila al tema: `showcase.music.boda-bot` → `boda-bot`. */
export function themeOfShowcaseKey(key: string): string | null {
  if (!key.startsWith(SHOWCASE_MUSIC_PREFIX)) return null
  const tema = key.slice(SHOWCASE_MUSIC_PREFIX.length)
  return CLAVE_DE_TEMA.test(tema) ? tema : null
}

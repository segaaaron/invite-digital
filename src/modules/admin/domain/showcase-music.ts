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
 * El tope por archivo, **más bajo que el de las fotografías de una boda** y a propósito.
 *
 * Esto lo sirve la web pública a cualquiera que abra un modelo, no a los invitados de una
 * boda concreta. Un bucle de treinta a sesenta segundos a 128 kbps ronda el megabyte, así
 * que tres dan holgura de sobra y acotan lo que un despiste puede poner a descargar a todo
 * el que entre en el catálogo.
 */
export const MAX_SHOWCASE_MUSIC_BYTES = 3 * 1024 * 1024

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

/** De la fila al tema: `showcase.music.boda-bot` → `boda-bot`. */
export function themeOfShowcaseKey(key: string): string | null {
  if (!key.startsWith(SHOWCASE_MUSIC_PREFIX)) return null
  const tema = key.slice(SHOWCASE_MUSIC_PREFIX.length)
  return CLAVE_DE_TEMA.test(tema) ? tema : null
}

/**
 * Si estos bytes son un MP3, mirados por su cabecera.
 *
 * **Nunca la extensión ni el `Content-Type`**: los dos los escribe quien sube el fichero.
 *
 * Un MP3 llega de dos formas y hay que aceptar las dos: con su etiqueta **ID3** delante
 * —lo normal, ahí van título y artista— o empezando directamente por una trama, que se
 * reconoce por su **sincronismo**: once bits a uno, o sea `0xFF` y los tres bits altos del
 * siguiente byte.
 *
 * El JPEG se descarta **antes**, y no es celo de más: también empieza por `0xFF`. Hoy no
 * chocan porque su segundo byte es `0xD8` y `0xD8 & 0xE0` da `0xC0`, pero el día que
 * alguien relaje la máscara, toda fotografía entraría por la puerta del audio y se
 * serviría como tal desde nuestro origen.
 *
 * Esta comprobación es gemela de la del módulo de eventos y **no la comparte**: aquí los
 * módulos solo se importan por su `index.ts`, y abrir esa frontera para una función de
 * cuatro líneas sale más caro que escribirla dos veces con su prueba en cada lado.
 */
export function esMp3(bytes: Uint8Array): boolean {
  const empieza = (...esperados: number[]): boolean => esperados.every((valor, i) => bytes[i] === valor)

  if (empieza(0xff, 0xd8, 0xff)) return false
  if (empieza(0x49, 0x44, 0x33)) return true

  const segundo = bytes[1]
  return bytes[0] === 0xff && segundo !== undefined && (segundo & 0xe0) === 0xe0
}

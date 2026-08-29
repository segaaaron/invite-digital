/**
 * Qué se admite como imagen de una invitación, y cómo se decide.
 *
 * Módulo puro: ni disco, ni base, ni `crypto`. Lo que hace es mirar bytes.
 */

/** Los cuatro formatos que un navegador pinta y que el atelier puede subir. */
export type MediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif'

/**
 * El tope por fichero.
 *
 * Ocho megabytes es una fotografía de móvil sin comprimir con holgura. Se comprueba
 * **antes** de leer el fichero a memoria: un `arrayBuffer()` de un archivo de dos gigas se
 * los trae enteros al servidor antes de que nadie lo rechace, y esa es la lección que ya
 * dejaron los comprobantes del Plan B.
 */
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024

/**
 * El lado más largo con el que se guarda una fotografía.
 *
 * Estos diseños están dibujados para una columna de teléfono —`ThemeColumn` la limita— y
 * ninguna ranura pinta más de unos 720 píxeles CSS de ancho. Con 1600 sobra para una
 * pantalla del doble de densidad, y una fotografía de móvil de cuatro megabytes baja a
 * unos pocos cientos de kilobytes.
 *
 * Es el lado largo, no el ancho: un retrato vertical y una panorámica se miden por lo
 * mismo, y así ninguna de las dos se estira.
 */
export const MAX_IMAGE_EDGE = 1600

/**
 * Cuántas fotografías puede subir **un grupo de invitados** desde su invitación.
 *
 * Existe porque ese extremo no tiene sesión: se autoriza con el token del enlace, y el
 * enlace circula por WhatsApp. Sin tope, quien lo tenga puede llenar el disco del servidor
 * de la boda a ocho megabytes por vez. Veinte es más de lo que sube un invitado y menos de
 * lo que hace daño.
 *
 * Es el tope **por grupo**, no por evento: contarlo por evento haría que el primer invitado
 * que suba deje sin sitio a los demás.
 */
export const MAX_GUEST_PHOTOS = 20

/**
 * El tipo real de un fichero, leído de sus primeros bytes.
 *
 * **Nunca la extensión ni el `Content-Type`**: los dos los escribe quien sube el fichero.
 * Un `.png` que en realidad es un HTML con un `<script>` dentro, servido desde nuestro
 * origen, es exactamente el agujero que esto cierra.
 *
 * `RIFF` no basta para WEBP —lo comparten WAV y AVI—, así que hay que mirar el byte 8. Y
 * la caja `ftyp` no basta para AVIF: la comparten MP4, HEIC y MOV, así que se comprueba la
 * marca de la caja.
 */
export function mediaTypeOf(bytes: Uint8Array): MediaType | null {
  const empieza = (desde: number, ...esperados: number[]): boolean =>
    esperados.every((valor, indice) => bytes[desde + indice] === valor)

  if (empieza(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (empieza(0, 0xff, 0xd8, 0xff)) return 'image/jpeg'
  // RIFF….WEBP
  if (empieza(0, 0x52, 0x49, 0x46, 0x46) && empieza(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp'
  // ….ftypavif  ·  ….ftypavis (secuencia de imágenes)
  if (empieza(4, 0x66, 0x74, 0x79, 0x70) && empieza(8, 0x61, 0x76, 0x69, 0x66)) return 'image/avif'
  if (empieza(4, 0x66, 0x74, 0x79, 0x70) && empieza(8, 0x61, 0x76, 0x69, 0x73)) return 'image/avif'

  return null
}

/** La extensión con la que se guarda en disco, deducida del tipo real. */
export const extensionFor = (tipo: MediaType): string =>
  ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif' })[tipo]

/**
 * El nombre del fichero en disco: **el identificador, nunca el nombre que llegó**.
 *
 * Componer una ruta con el nombre original sería dejar que quien sube elija dónde se
 * escribe, y hay prueba con `../../etc/passwd` de nombre.
 */
export const storageKeyFor = (id: string, tipo: MediaType): string => `${id}.${extensionFor(tipo)}`

/** El nombre original, recortado, solo para enseñarlo en el panel. */
export const displayNameOf = (nombre: string): string => nombre.trim().slice(0, 255) || 'imagen'

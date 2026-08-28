/**
 * Si quien mira pidió menos movimiento.
 *
 * Vive suelto y no dentro de `Reveal` porque lo consultan las veinte piezas animadas del
 * kit, y porque así la regla se lee en un sitio: **sin animación, el contenido visible**.
 * Los fondos de partículas son la única excepción y la razonan ellos mismos: son
 * decoración pura y su estado quieto no aporta nada, así que no se pintan.
 *
 * Se llama en el primer render, no en un efecto: un efecto pintaría un fotograma con la
 * animación puesta antes de corregirse, que es exactamente el parpadeo que la preferencia
 * pide evitar. En el servidor no hay `matchMedia`, y ahí se devuelve `false`: el marcado
 * inicial anima y el cliente lo corrige antes de pintar.
 */
export function prefiereMenosMovimiento(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

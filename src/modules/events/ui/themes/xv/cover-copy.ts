/**
 * El rótulo de la portada: «MIS QUINCE · VALENTINA».
 *
 * El rótulo del contenido viene adornado con sus puntos —«· MIS QUINCE ·»—, que es como lo
 * pinta el diseño en el interior de la invitación. Aquí se le quitan antes de encadenarlo
 * con el nombre: si no, sale «· MIS QUINCE · · VALENTINA».
 */
export function rotuloDePortada(eyebrow: string, name: string): string {
  return `${eyebrow.replace(/^[\s·]+|[\s·]+$/g, '')} · ${name.toUpperCase()}`
}

/**
 * El mismo rótulo dentro de una chapa con borde, que es como lo llevan cinco de los ocho.
 *
 * El triángulo es del dibujo de la chapa, no del texto: «Encanto Marino» escribe el rótulo
 * suelto sobre la partitura y ahí no pinta nada.
 */
export function chapaDePortada(eyebrow: string, name: string): string {
  return `▸ ${rotuloDePortada(eyebrow, name)}`
}

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

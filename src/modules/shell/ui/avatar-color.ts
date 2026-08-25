/**
 * La paleta de avatares de la maqueta, seis colores. El color sale del **nombre** y no de
 * la posición en la lista: así la misma persona lleva siempre el mismo, y una fila nueva
 * no repinta las de abajo.
 */
const COLORES = [
  'from-avatar-1 to-avatar-1-deep',
  'from-avatar-2 to-avatar-2-deep',
  'from-avatar-3 to-avatar-3-deep',
  'from-avatar-4 to-avatar-4-deep',
  'from-avatar-5 to-avatar-5-deep',
  'from-avatar-6 to-avatar-6-deep',
] as const

export function avatarColor(nombre: string): string {
  let suma = 0
  for (const letra of nombre) suma = (suma + (letra.codePointAt(0) ?? 0)) % 997
  return COLORES[suma % COLORES.length] ?? COLORES[0]
}

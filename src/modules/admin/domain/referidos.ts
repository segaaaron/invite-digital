import { randomInt } from 'node:crypto'

/**
 * **Los referidos**: cada evento celebrado tiene un código; quien compra con él recibe el descuento
 * de recomendación, y el cliente que lo compartió aparece en su ficha con cuántos trajo.
 *
 * Seis caracteres sin `0`, `O`, `1`, `I` ni `L`: se dicta por teléfono y se copia de un WhatsApp.
 */
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const LARGO_DE_CODIGO = 6

export function nuevoCodigoDeReferido(): string {
  let codigo = ''
  for (let i = 0; i < LARGO_DE_CODIGO; i += 1) codigo += ALFABETO[randomInt(ALFABETO.length)]
  return codigo
}

/** Lo que teclea un humano —minúsculas, espacios, guiones— a la forma guardada. Lo que no casa, `null`. */
export function normalizarCodigo(crudo: string): string | null {
  const limpio = crudo.replace(/[\s-]+/g, '').toUpperCase()
  if (limpio === '') return null
  return limpio.length === LARGO_DE_CODIGO && [...limpio].every((c) => ALFABETO.includes(c)) ? limpio : null
}

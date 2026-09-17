/**
 * El código corto del pase: cinco caracteres para escribir a mano en la puerta cuando el QR no se
 * puede leer. Mayúsculas y números **sin los que se confunden** (0/O, 1/I/L), como la referencia
 * de los pedidos: se dicta y se teclea con poca luz.
 *
 * No es un secreto como el enlace: abre la entrada de **ese** evento en la puerta, que ya tiene la
 * lista. Único por evento (índice en la base).
 */
export const ALFABETO_DE_PASE = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
export const LARGO_DE_PASE = 5

export function codigoDePase(azar: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  return Array.from(azar(LARGO_DE_PASE), (b) => ALFABETO_DE_PASE[b % ALFABETO_DE_PASE.length]).join('')
}

/** Lo que escribió la puerta, normalizado: sin espacios ni guiones, en mayúsculas. `null` si no tiene forma de código. */
export function leerCodigoDePase(entrada: string): string | null {
  const limpio = entrada.replace(/[\s-]/g, '').toUpperCase()
  return new RegExp(`^[${ALFABETO_DE_PASE}]{${LARGO_DE_PASE}}$`).test(limpio) ? limpio : null
}

import { err, ok, type Result } from '@/shared/result'

/**
 * El dinero del sistema: importes en **centavos enteros**. Vivía en la mesa de regalos
 * (`registry`) y lo importaban el planner, el admin y media docena de páginas: un concepto
 * transversal guardado en un módulo de negocio. El error es propio y con la misma forma que el
 * de la mesa de regalos (`kind: 'invalid_amount'`), así que quien lo usaba no cambia.
 */
export type MoneyError = { readonly kind: 'invalid_amount'; readonly detail: string }
const moneyError = (detail: string): MoneyError => ({ kind: 'invalid_amount', detail })

/**
 * El techo de un `integer` de Postgres, que es el tipo de las tres columnas de importe.
 * Por encima la base rompería con un desbordamiento en vez de devolver un mensaje que
 * el atelier pueda leer en el formulario.
 */
export const MAX_AMOUNT_CENTS = 2_147_483_647

/**
 * El respaldo cuando no hay evento a mano. Desde que `events.currency` existe, la moneda
 * que se pinta sale del evento: esta constante solo cubre a los eventos anteriores a esa
 * columna, que se leen como BOB —que es lo que tenían clavado en el código—.
 */
export const DEFAULT_CURRENCY = 'BOB'

/**
 * Las formas que se aceptan, todas sin signo. No se admite el separador de millares a
 * solas —`1.234`— porque es ambiguo: puede ser mil doscientos treinta y cuatro o uno con
 * doscientos treinta y cuatro. Con dinero, lo ambiguo se rechaza y se pregunta.
 */
// Grupos por posición, no con nombre: el `target` del proyecto es ES2017 y los grupos
// con nombre exigen ES2018. El primer grupo es la parte entera, el segundo la decimal.
const SHAPES: readonly RegExp[] = [
  /^(\d+)$/, //                              150
  /^(\d+),(\d{1,2})$/, //                    0,50 · 12,5
  /^(\d+)\.(\d{1,2})$/, //                   1234.50
  /^(\d{1,3}(?:\.\d{3})+),(\d{1,2})$/, //    1.234,50
  /^(\d{1,3}(?:,\d{3})+)\.(\d{1,2})$/, //    1,234.50
]

/**
 * Devuelve el importe en **centavos enteros**.
 *
 * No hay ni una operación en coma flotante: la parte entera y la decimal se tratan como
 * cadenas y se concatenan. `parseFloat('1234.50') * 100` da `123449.99999999999`, y
 * redondear eso es tapar el problema, no resolverlo; el céntimo perdido ya quedó escrito
 * en la base y no hay forma de saber después cuál era el importe verdadero.
 */
export const parseAmount = (text: string): Result<number, MoneyError> => {
  const limpio = text.trim()
  if (limpio.length === 0) return err(moneyError('Escribe un importe.'))

  const match = SHAPES.map((shape) => shape.exec(limpio)).find((m) => m !== null)
  if (!match) {
    return err(moneyError(`No es un importe: "${text}". Usa 1.234,50 o 1234.50.`))
  }

  const enteroDigits = (match[1] ?? '').replaceAll('.', '').replaceAll(',', '')
  const decimalDigits = (match[2] ?? '').padEnd(2, '0')

  // Concatenar las cadenas y convertir una sola vez: el entero resultante es exacto.
  const cents = Number(`${enteroDigits}${decimalDigits}`)

  if (!Number.isSafeInteger(cents)) return err(moneyError('Ese importe es demasiado grande.'))
  if (cents === 0) return err(moneyError('El importe tiene que ser mayor que cero.'))
  if (cents > MAX_AMOUNT_CENTS) return err(moneyError('Ese importe es demasiado grande.'))

  return ok(cents)
}

/**
 * `Intl.NumberFormat` recibe el importe como **cadena decimal**, no como número: así ni
 * el formateo introduce una división en coma flotante. Los dos decimales se escriben
 * siempre, incluso cuando son cero.
 */
export const formatAmount = (cents: number, currency: string): string => {
  const signo = cents < 0 ? '-' : ''
  const absoluto = Math.abs(Math.trunc(cents))
  const entero = Math.trunc(absoluto / 100)
  const decimal = String(absoluto % 100).padStart(2, '0')

  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    // La aserción es sobre el tipo, no sobre el valor: `-?<dígitos>.<dos dígitos>` es
    // literalmente un `StringNumericLiteral`, pero TypeScript no lo deduce de una
    // plantilla. `Intl` lo lee como decimal exacto, sin pasar por un double.
  }).format(`${signo}${entero}.${decimal}` as Intl.StringNumericLiteral)
}

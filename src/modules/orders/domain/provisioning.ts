/**
 * Lo que hace falta para convertir un pedido aprobado en un evento.
 *
 * Puro y sin reloj: las dos decisiones que hay aquí —cómo se llama el evento y cuándo
 * cierran las confirmaciones— se prueban enteras, y la acción que las usa solo tiene que
 * traer los datos.
 */

const DIAS_DE_CIERRE = 15
const MS_POR_DIA = 86_400_000

/**
 * El `slug` del evento sale de la **referencia del pedido**, no del nombre del cliente.
 *
 * La referencia ya es única por el `unique` de su columna, así que el slug lo es también.
 * Derivarlo del nombre chocaría en cuanto hubiera dos bodas de los García, y el alta
 * fallaría con `duplicate_slug` justo después de que el cliente pagara.
 *
 * El alfabeto de la referencia no tiene `0`, `O`, `1`, `I` ni `L`, y en minúsculas casa
 * con la forma que exige el dominio del evento: minúsculas, números y guiones.
 */
export const eventSlugFor = (publicRef: string): string => `evento-${publicRef.trim().toLowerCase()}`

/**
 * Cuándo dejan de admitirse confirmaciones: quince días antes del evento.
 *
 * Se calcula en UTC a partir de la fecha ISO, sin `new Date(cadena)`: esa forma
 * interpreta la zona horaria del servidor y en Bolivia —UTC−4— devuelve el día anterior.
 * Nunca queda después del evento, que es lo único que el dominio prohíbe.
 */
export function rsvpDeadlineFor(eventDate: string, dias: number = DIAS_DE_CIERRE): string {
  const partes = eventDate.split('-').map(Number)
  const [anio, mes, dia] = partes
  if (anio === undefined || mes === undefined || dia === undefined) return eventDate

  const fecha = new Date(Date.UTC(anio, mes - 1, dia) - dias * MS_POR_DIA)
  return fecha.toISOString().slice(0, 10)
}

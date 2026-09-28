/**
 * El mes del calendario de eventos: sus semanas de lunes a domingo, con los días de fuera del mes
 * para completar la rejilla. Puro: el mes llega como `YYYY-MM`.
 */
export type DiaDelMes = { readonly iso: string; readonly dia: number; readonly delMes: boolean; readonly finDeSemana: boolean }

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** `YYYY-MM` válido o el de `hoy`. */
export function mesDe(pedido: string | undefined, hoy: string): string {
  return pedido !== undefined && /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) ? pedido : hoy.slice(0, 7)
}

export function mesVecino(mes: string, salto: -1 | 1): string {
  const [a, m] = mes.split('-').map(Number) as [number, number]
  const d = new Date(Date.UTC(a, m - 1 + salto, 1))
  return iso(d).slice(0, 7)
}

/** Las semanas del mes, de lunes a domingo, completas con los días vecinos. */
export function semanasDelMes(mes: string): DiaDelMes[][] {
  const [a, m] = mes.split('-').map(Number) as [number, number]
  const primero = new Date(Date.UTC(a, m - 1, 1))
  // Lunes = 0 … domingo = 6.
  const desplazamiento = (primero.getUTCDay() + 6) % 7
  const inicio = new Date(primero.getTime() - desplazamiento * 86_400_000)
  const semanas: DiaDelMes[][] = []
  let cursor = inicio
  do {
    const semana: DiaDelMes[] = []
    for (let i = 0; i < 7; i += 1) {
      semana.push({ iso: iso(cursor), dia: cursor.getUTCDate(), delMes: cursor.getUTCMonth() === m - 1, finDeSemana: i >= 5 })
      cursor = new Date(cursor.getTime() + 86_400_000)
    }
    semanas.push(semana)
  } while (cursor.getUTCMonth() === m - 1)
  return semanas
}

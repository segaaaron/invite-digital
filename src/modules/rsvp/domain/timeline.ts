export type TimelineBar = {
  /** El día en `YYYY-MM-DD`, hora local: el panel lo mira desde Bolivia, no desde UTC. */
  readonly day: string
  /** La inicial del día de la semana, que es el eje de la maqueta. */
  readonly label: string
  readonly count: number
}

const INICIALES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const

/** `YYYY-MM-DD` en hora local. `toISOString` daría el día de UTC y en Bolivia, a partir
 *  de las 20:00, movería la respuesta al día siguiente. */
function claveLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

/**
 * Las respuestas repartidas por día, una barra por día, de más antiguo a más reciente.
 *
 * Los días sin respuesta ocupan su hueco con un cero: comprimirlos convertiría dos
 * semanas flojas en un gráfico que aparenta actividad continua.
 */
export function dailySeries(dates: readonly Date[], end: Date, days: number): TimelineBar[] {
  if (days <= 0) return []

  const cuenta = new Map<string, number>()
  for (const fecha of dates) {
    const clave = claveLocal(fecha)
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1)
  }

  const barras: TimelineBar[] = []
  for (let atras = days - 1; atras >= 0; atras -= 1) {
    const fecha = new Date(end.getFullYear(), end.getMonth(), end.getDate() - atras)
    const clave = claveLocal(fecha)
    barras.push({ day: clave, label: INICIALES[fecha.getDay()] ?? '', count: cuenta.get(clave) ?? 0 })
  }
  return barras
}

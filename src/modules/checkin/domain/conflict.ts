import { isLive, type Arrival } from './arrival'

export type ResolvedArrival = {
  readonly guestGroupId: string
  readonly arrivedAt: Date
  readonly arrivedCount: number
  /** Escaneos vivos del grupo. Más de uno significa dos puertas o un reenvío doble. */
  readonly scanCount: number
  /** Quién entró y a qué hora, por persona. Vacío en las invitaciones sin nombres. */
  readonly personas: Readonly<Record<string, Date>>
}

/**
 * Un grupo puede tener varias filas: dos puertas sin red, o un reintento que llegó por
 * caminos distintos. La regla que hace que sincronizar tarde no reescriba la historia:
 * la hora la fija el escaneo más temprano —es cuando cruzaron la puerta— y la cantidad
 * la fija el más reciente, que es la última corrección que hizo un humano.
 */
export function resolveArrival(arrivals: readonly Arrival[]): ResolvedArrival | null {
  const live = arrivals.filter(isLive)
  const first = live[0]
  if (!first) return null

  let earliest = first
  let latest = first
  for (const arrival of live) {
    if (arrival.scannedAt < earliest.scannedAt) earliest = arrival
    if (arrival.scannedAt > latest.scannedAt) latest = arrival
  }

  // Por persona se **suma**: la unión de todos los escaneos, cada una a la hora del primero
  // que la trae. Dos puertas sin red registrando a los dos de una pareja no se pisan.
  const personas: Record<string, Date> = {}
  let ultimoPorNumero: Arrival | null = null
  for (const arrival of live) {
    if (arrival.personIds === undefined || arrival.personIds === null) {
      if (ultimoPorNumero === null || arrival.scannedAt > ultimoPorNumero.scannedAt) ultimoPorNumero = arrival
      continue
    }
    for (const id of arrival.personIds) {
      const antes = personas[id]
      if (antes === undefined || arrival.scannedAt < antes) personas[id] = arrival.scannedAt
    }
  }
  const porPersona = Object.keys(personas).length

  return {
    guestGroupId: first.guestGroupId,
    arrivedAt: earliest.scannedAt,
    // Sin personas, la cantidad del último escaneo (la última corrección humana). Con
    // personas, cuántas entraron; si además hubo escaneos por número, el mayor de los dos.
    arrivedCount: porPersona === 0 ? latest.arrivedCount : Math.max(porPersona, ultimoPorNumero?.arrivedCount ?? 0),
    scanCount: live.length,
    personas,
  }
}

/**
 * Lo que la puerta ve al recibir el estado del servidor (otra puerta registró, o volvió la red):
 * en cada invitación que el servidor conoce **manda el servidor**; las que solo tiene esta
 * puerta —registradas sin red, todavía en la bandeja de salida— se quedan.
 */
export function unirLlegadas(servidor: readonly ResolvedArrival[], locales: readonly ResolvedArrival[]): ResolvedArrival[] {
  const conocidas = new Set(servidor.map((a) => a.guestGroupId))
  return [...servidor, ...locales.filter((a) => !conocidas.has(a.guestGroupId))]
}

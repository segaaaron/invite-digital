/**
 * **Un evento celebrado queda para mirar** (8 de octubre, pedido del usuario): desde el día siguiente nadie
 * del equipo lo cambia ni lo borra; solo el admin corrige. La fiesta sigue de madrugada —el cronograma
 * también cuenta así—, así que se cierra **a las 06:00 del día siguiente**, hora de Bolivia (UTC−4, sin
 * horario de verano).
 */
const CIERRE_UTC_MS = (24 + 6 + 4) * 60 * 60 * 1000

export function yaSeCelebro(eventDate: string, ahora: Date): boolean {
  return ahora.getTime() >= Date.parse(`${eventDate}T00:00:00Z`) + CIERRE_UTC_MS
}

/** «Mis eventos»: primero lo que viene, el más cercano arriba; después lo celebrado, lo último primero. */
export function enOrdenParaElCliente<E extends { eventDate: string }>(eventos: readonly E[], ahora: Date): E[] {
  const vienen = eventos.filter((e) => !yaSeCelebro(e.eventDate, ahora)).sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const pasaron = eventos.filter((e) => yaSeCelebro(e.eventDate, ahora)).sort((a, b) => b.eventDate.localeCompare(a.eventDate))
  return [...vienen, ...pasaron]
}

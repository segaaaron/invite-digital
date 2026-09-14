import { diasEntre } from './hoy'

/**
 * En qué punto está cada boda. Sale de lo que ya se guarda —estado, grupos y enlaces
 * repartidos—: no es una columna que alguien tenga que acordarse de mover.
 */
export const ETAPAS = [
  { clave: 'borrador', etiqueta: 'Borrador', tono: 'no' },
  { clave: 'sin_invitados', etiqueta: 'Sin invitados', tono: 'no' },
  { clave: 'repartiendo', etiqueta: 'Repartiendo', tono: 'pending' },
  { clave: 'confirmando', etiqueta: 'Confirmando', tono: 'maybe' },
  { clave: 'cerrada', etiqueta: 'Cerrada', tono: 'ok' },
  { clave: 'celebrada', etiqueta: 'Celebrada', tono: 'ok' },
] as const

export type Etapa = (typeof ETAPAS)[number]['clave']

export function etapaDe(
  evento: { eventDate: string; status: string; grupos: number; enviados: number },
  hoy: string,
): Etapa {
  if (diasEntre(hoy, evento.eventDate) < 0) return 'celebrada'
  if (evento.status === 'closed') return 'cerrada'
  if (evento.status !== 'live') return 'borrador'
  if (evento.grupos === 0) return 'sin_invitados'
  if (evento.enviados < evento.grupos) return 'repartiendo'
  return 'confirmando'
}

/**
 * Las que vienen, por cercanía; las celebradas detrás, la más reciente arriba. Ordenar
 * todo por fecha descendente —como estaba— dejaba arriba la boda de dentro de un año y
 * enterraba la del sábado.
 */
export function ordenarCartera<T extends { eventDate: string }>(filas: readonly T[], hoy: string): T[] {
  const vienen = filas.filter((f) => f.eventDate >= hoy).sort((a, b) => a.eventDate.localeCompare(b.eventDate))
  const pasadas = filas.filter((f) => f.eventDate < hoy).sort((a, b) => b.eventDate.localeCompare(a.eventDate))
  return [...vienen, ...pasadas]
}

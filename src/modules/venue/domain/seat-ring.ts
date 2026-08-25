import type { TableShape } from './venue-table'
import type { SeatedGroup } from './seating'

export type Seat = {
  /** Grados desde arriba, en el sentido de las agujas del reloj. Solo para mesa redonda. */
  readonly angle: number
  /** Posición dentro del recuadro de la mesa, en porcentaje. La usan las alargadas. */
  readonly x: number
  readonly y: number
  /** El grupo que la ocupa lleva a alguien marcado VIP: la maqueta la pinta dorada. */
  readonly vip: boolean
  /** Quién ocupa la silla, o `null` si está libre. */
  readonly occupant: { readonly id: string; readonly label: string } | null
  /** La inicial que se pinta dentro de la silla ocupada. */
  readonly initial: string | null
}

/**
 * Las sillas alrededor de una mesa, como las dibuja `Dashboard.html`: una por sitio,
 * repartidas por la circunferencia y con la inicial de quien la ocupa.
 *
 * Nunca dibuja más sillas que el cupo de la mesa. Si a un grupo se le asignó más gente
 * de la que cabe —el reparto lo permite y el contador lo canta—, el plano sigue
 * enseñando el salón que existe, no uno inventado con sillas de más.
 */
export function seatRing(
  capacity: number,
  groups: readonly SeatedGroup[],
  shape: TableShape = 'round',
): Seat[] {
  if (capacity <= 0) return []

  const ocupantes: Array<{ id: string; label: string; vip: boolean }> = []
  for (const grupo of groups) {
    for (let i = 0; i < grupo.seats && ocupantes.length < capacity; i += 1) {
      ocupantes.push({ id: grupo.id, label: grupo.label, vip: grupo.vip === true })
    }
  }

  // Redonda y «de los novios» reparten por la circunferencia; rectangular e imperial
  // sientan en dos lados, como la maqueta: una mesa alargada con las sillas en círculo no
  // es la mesa que va a haber en el salón.
  const enDosFilas = shape === 'rect' || shape === 'imperial'
  const arriba = Math.ceil(capacity / 2)

  const sitio = (indice: number): { x: number; y: number } => {
    if (!enDosFilas) {
      const radianes = ((360 / capacity) * indice - 90) * (Math.PI / 180)
      return { x: 50 + Math.cos(radianes) * 42, y: 50 + Math.sin(radianes) * 42 }
    }
    const enFilaSuperior = indice < arriba
    const cuantos = enFilaSuperior ? arriba : capacity - arriba
    const posicion = enFilaSuperior ? indice : indice - arriba
    const paso = cuantos > 1 ? 76 / (cuantos - 1) : 0
    return { x: 12 + (cuantos > 1 ? posicion * paso : 38), y: enFilaSuperior ? 12 : 88 }
  }

  return Array.from({ length: capacity }, (_, indice) => {
    const ocupante = ocupantes[indice] ?? null
    const nombre = ocupante?.label.trim() ?? ''
    return {
      angle: (360 / capacity) * indice,
      ...sitio(indice),
      vip: ocupante?.vip ?? false,
      occupant: ocupante,
      // Un nombre en blanco daría una silla ocupada con la inicial vacía, que se lee
      // como libre. El punto dice «hay alguien y no sabemos cómo se llama».
      initial: ocupante === null ? null : (nombre.slice(0, 1).toLocaleUpperCase('es-BO') || '·'),
    }
  })
}

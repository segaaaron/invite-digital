import type { SeatedGroup } from './seating'

export type Seat = {
  /** Grados desde arriba, en el sentido de las agujas del reloj. */
  readonly angle: number
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
export function seatRing(capacity: number, groups: readonly SeatedGroup[]): Seat[] {
  if (capacity <= 0) return []

  const ocupantes: Array<{ id: string; label: string }> = []
  for (const grupo of groups) {
    for (let i = 0; i < grupo.seats && ocupantes.length < capacity; i += 1) {
      ocupantes.push({ id: grupo.id, label: grupo.label })
    }
  }

  return Array.from({ length: capacity }, (_, indice) => {
    const ocupante = ocupantes[indice] ?? null
    const nombre = ocupante?.label.trim() ?? ''
    return {
      angle: (360 / capacity) * indice,
      occupant: ocupante,
      // Un nombre en blanco daría una silla ocupada con la inicial vacía, que se lee
      // como libre. El punto dice «hay alguien y no sabemos cómo se llama».
      initial: ocupante === null ? null : (nombre.slice(0, 1).toLocaleUpperCase('es-BO') || '·'),
    }
  })
}

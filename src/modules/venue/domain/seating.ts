import type { VenueTable } from './venue-table'

/**
 * La unidad que se sienta es el grupo, igual que la unidad que se invita. `seats` son
 * los sitios que ocupa; `tableId` es la mesa donde ya está, o `null` si no tiene.
 */
export type SeatedGroup = {
  readonly id: string
  readonly label: string
  readonly seats: number
  readonly tableId: string | null
  /** Alguien del grupo está marcado VIP: la maqueta le pinta la silla en dorado. */
  readonly vip?: boolean
  /** Alguien del grupo tiene restricción alimentaria: la maqueta lo marca con 🍽. */
  readonly dietary?: boolean
}

export type Occupancy = { readonly taken: number; readonly free: number }

export function occupancyOf(table: Pick<VenueTable, 'id' | 'capacity'>, groups: readonly SeatedGroup[]): Occupancy {
  const taken = groups.reduce((sum, group) => (group.tableId === table.id ? sum + group.seats : sum), 0)
  // Nunca negativo: una mesa sobrecargada por una edición del cupo tiene cero libres,
  // no menos-tres, y la tarjeta no puede ofrecer sitios que no existen.
  return { taken, free: Math.max(0, table.capacity - taken) }
}

/**
 * Un grupo no se parte entre dos mesas: o cabe entero o no cabe. Si el grupo ya está
 * sentado en esta mesa no se cuenta dos veces — reasignarlo a donde ya está no puede
 * fallar por «no cabe».
 */
export function canSeat(
  table: Pick<VenueTable, 'id' | 'capacity'>,
  group: SeatedGroup,
  groups: readonly SeatedGroup[],
): boolean {
  const others = groups.filter((g) => g.id !== group.id)
  return occupancyOf(table, others).free >= group.seats
}

export type Assignment = { readonly groupId: string; readonly tableId: string }

export type AutoAssignResult = {
  readonly assignments: readonly Assignment[]
  readonly unplaced: readonly SeatedGroup[]
}

/** Orden total y estable: cupos descendente, luego etiqueta, luego id. Sin azar ni reloj. */
const byBiggestFirst = (a: SeatedGroup, b: SeatedGroup): number =>
  b.seats - a.seats || a.label.localeCompare(b.label) || a.id.localeCompare(b.id)

/**
 * Reparte los grupos que aún no tienen mesa. Determinista: dos ejecuciones con los
 * mismos datos dan exactamente el mismo resultado.
 *
 * Los grupos grandes van primero porque son los que se quedan sin sitio si el salón se
 * llena antes con parejas sueltas. A cada uno le toca la mesa donde quepa entero
 * dejando el menor hueco, desempatando por etiqueta.
 *
 * Nunca mueve lo que un humano colocó: eso ya es una decisión tomada.
 */
export function autoAssign(tables: readonly VenueTable[], groups: readonly SeatedGroup[]): AutoAssignResult {
  const free = new Map<string, number>()
  for (const t of tables) free.set(t.id, occupancyOf(t, groups).free)

  const assignments: Assignment[] = []
  const unplaced: SeatedGroup[] = []

  for (const group of [...groups].filter((g) => g.tableId === null).sort(byBiggestFirst)) {
    let best: VenueTable | null = null
    let bestGap = Number.POSITIVE_INFINITY

    for (const table of tables) {
      const gap = (free.get(table.id) ?? 0) - group.seats
      if (gap < 0) continue
      if (gap < bestGap || (gap === bestGap && best !== null && table.label.localeCompare(best.label) < 0)) {
        best = table
        bestGap = gap
      }
    }

    if (best === null) {
      unplaced.push(group)
      continue
    }

    free.set(best.id, bestGap)
    assignments.push({ groupId: group.id, tableId: best.id })
  }

  return { assignments, unplaced }
}

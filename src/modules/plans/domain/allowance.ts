/**
 * Lo que el plan de un evento permite, ya resuelto. Los módulos que aplican un límite
 * reciben esto como argumento: no importan el módulo de planes, porque atarlos a una
 * regla comercial que va a cambiar los volvería dependientes para siempre.
 */
export type Allowance = {
  readonly planSlug: string
  /** `null` es sin límite. No es cero. */
  readonly maxGuestGroups: number | null
  readonly seating: boolean
  readonly registry: boolean
  readonly checkin: boolean
  /** Cuántos porteros caben. Cero: ninguno. Siempre un número: la puerta no se vende sin tope. */
  readonly maxDoorPorters: number
}

/** Las funciones que un plan puede incluir o no. */
export type PlanFeature = 'seating' | 'registry' | 'checkin'

/** Umbral del aviso: por debajo no se dice nada, chocar sin verlo venir es peor. */
export const WARNING_RATIO = 0.8

/**
 * Si cabe **uno más**. `current` es cuántos hay ya, así que en el límite justo la
 * respuesta es no: con 30 de límite y 30 creados, el siguiente haría 31.
 */
export const canAddGroup = (limit: number | null, current: number): boolean => limit === null || current < limit

/**
 * Cuántos caben todavía. `null` cuando no hay límite —no un número enorme, que se
 * colaría en la pantalla como si fuera un margen real— y nunca negativo: un plan puede
 * bajar de límite cuando el evento ya tiene más grupos de los que ahora admite.
 */
export const remainingGroups = (limit: number | null, current: number): number | null =>
  limit === null ? null : Math.max(0, limit - current)

/**
 * Qué parte del cupo va gastada, entre 0 y 1. `null` sin límite. Con límite cero el
 * cupo está lleno por definición: dividir daría `NaN` o `Infinity`, y cualquiera de los
 * dos comparado contra el umbral no avisaría jamás.
 */
export const usageRatio = (limit: number | null, current: number): number | null => {
  if (limit === null) return null
  if (limit <= 0) return 1
  return current / limit
}

export const hasFeature = (allowance: Allowance, feature: PlanFeature): boolean => allowance[feature]

/**
 * El plan más barato del catálogo que sí trae la función. `null` si no la trae ninguno.
 *
 * Hace falta para que el rechazo sirva de algo: «no incluido» a secas deja al atelier
 * sin salida, y tiene que poder decirle al cliente a qué plan subir. El catálogo llega
 * ordenado, así que el primero que la traiga es el más barato que la trae.
 */
export const planThatIncludes = (feature: PlanFeature, catalog: readonly Allowance[]): string | null =>
  catalog.find((plan) => hasFeature(plan, feature))?.planSlug ?? null

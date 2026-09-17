import type { ResolvedArrival } from './conflict'
import type { DoorGroup } from './door-tally'

export type EstadoDeLlegada = 'dentro' | 'por_llegar' | 'no_viene'

export type FilaDeLlegada = {
  readonly clave: string
  readonly nombre: string
  /** La invitación, cuando no es la propia persona; `null` en las que no tienen nombres. */
  readonly invitacion: string | null
  readonly estado: EstadoDeLlegada
  readonly hora: Date | null
}

/**
 * Quién está dentro y a quién se espera, persona por persona, para la recepción y para el
 * anfitrión. Una invitación sin nombres cuenta como una fila. «No viene» es quien respondió que
 * no y todavía no apareció: si llega, entra igual y sale como dentro.
 */
export function listaDeLlegadas(
  groups: readonly DoorGroup[],
  arrivals: readonly ResolvedArrival[],
  personas: Readonly<Record<string, readonly { readonly id: string; readonly fullName: string }[]>>,
): FilaDeLlegada[] {
  const porInvitacion = new Map(arrivals.map((a) => [a.guestGroupId, a]))
  return groups
    .filter((g) => !g.revoked)
    .flatMap((g): FilaDeLlegada[] => {
      const llegada = porInvitacion.get(g.id)
      const noViene = g.attending === 0
      const suyas = personas[g.id] ?? []
      if (suyas.length === 0) {
        return [{ clave: g.id, nombre: g.label, invitacion: null, estado: llegada ? 'dentro' : noViene ? 'no_viene' : 'por_llegar', hora: llegada?.arrivedAt ?? null }]
      }
      return suyas.map((p) => {
        const hora = llegada?.personas[p.id] ?? null
        return { clave: p.id, nombre: p.fullName, invitacion: g.label, estado: hora ? 'dentro' : noViene ? 'no_viene' : 'por_llegar', hora }
      })
    })
}

import type { Allowance } from './allowance'

/**
 * Qué hace un extra al evento que lo compra. Los que llevan número suman ese número; los
 * demás encienden algo. `servicio` es trabajo nuestro —la entrega exprés—: se cobra y no
 * toca la capacidad.
 */
export type EfectoDeExtra = 'cambio_modelo' | 'fotos_invitados' | 'mas_grupos' | 'mas_dias' | 'mas_porteros' | 'sumar_planner' | 'dia_d' | 'servicio'
export const EFECTOS_DE_EXTRA: readonly EfectoDeExtra[] = ['cambio_modelo', 'fotos_invitados', 'mas_grupos', 'mas_dias', 'mas_porteros', 'sumar_planner', 'dia_d', 'servicio']
export const NOMBRE_DE_EFECTO: Record<EfectoDeExtra, string> = {
  cambio_modelo: 'Cambiar de modelo hasta repartir',
  fotos_invitados: 'Fotos de los invitados',
  mas_grupos: 'Más grupos de invitados',
  mas_dias: 'Más días en línea',
  mas_porteros: 'Más porteros',
  sumar_planner: 'Sumar un planner',
  dia_d: 'Día D y enlaces para proveedores',
  servicio: 'Servicio (sin cambio en el panel)',
}

export type ExtraAplicado = { readonly effect: EfectoDeExtra; readonly amount: number }

/**
 * La capacidad del plan con los extras que compró el evento. **Nunca baja** lo que el plan ya
 * trae, y lo que no tiene límite sigue sin límite.
 */
export function aplicarExtras(base: Allowance, extras: readonly ExtraAplicado[]): Allowance {
  let a = base
  for (const { effect, amount } of extras) {
    switch (effect) {
      case 'mas_grupos':
        a = { ...a, maxGuestGroups: a.maxGuestGroups === null ? null : a.maxGuestGroups + amount }
        break
      case 'mas_porteros':
        // Porteros sin puerta no sirven: el extra trae la puerta.
        a = { ...a, maxDoorPorters: a.maxDoorPorters + amount, checkin: true }
        break
      case 'sumar_planner':
        a = { ...a, maxHiredPlanners: a.maxHiredPlanners === null ? null : a.maxHiredPlanners + amount }
        break
      case 'mas_dias':
        a = { ...a, onlineDays: a.onlineDays + amount }
        break
      case 'fotos_invitados':
        a = { ...a, guestPhotos: true }
        break
      case 'cambio_modelo':
        a = { ...a, designChange: a.designChange === 'ninguno' ? 'antes_de_repartir' : a.designChange }
        break
      case 'dia_d':
        // Sube el completo a total y nada más: sobre un plan esencial (bajado de plan después
        // de comprarlo) regalaría proveedores, cronograma y cortejo.
        a = a.plannerSuite === 'completo' ? { ...a, plannerSuite: 'total' } : a
        break
      case 'servicio':
        break
    }
  }
  return a
}

export type ExtraNoDisponible = 'incluido' | 'requiere_plan'

/**
 * Si un extra se le puede vender a este evento, con la capacidad **ya con sus extras**. Lo que
 * solo enciende algo no se vende a quien ya lo tiene: se cobraría dos veces por nada. El Día
 * D sube el planner a `total`, que trae también lo de `completo`: a un plan esencial le
 * regalaría proveedores, cronograma y cortejo, así que solo se vende sobre `completo`.
 */
export function extraDisponible(a: Allowance, effect: EfectoDeExtra): { ok: true } | { ok: false; motivo: ExtraNoDisponible } {
  const incluido = { ok: false, motivo: 'incluido' } as const
  switch (effect) {
    case 'dia_d':
      return a.plannerSuite === 'total' ? incluido : a.plannerSuite === 'completo' ? { ok: true } : { ok: false, motivo: 'requiere_plan' }
    case 'fotos_invitados':
      return a.guestPhotos ? incluido : { ok: true }
    case 'cambio_modelo':
      return a.designChange === 'ninguno' ? { ok: true } : incluido
    case 'mas_grupos':
      return a.maxGuestGroups === null ? incluido : { ok: true }
    case 'sumar_planner':
      return a.maxHiredPlanners === null ? incluido : { ok: true }
    case 'mas_porteros':
    case 'mas_dias':
    case 'servicio':
      return { ok: true }
  }
}

export type Extra = {
  readonly slug: string
  readonly name: string
  readonly priceCents: number
  readonly currency: string
  readonly effect: EfectoDeExtra
  readonly amount: number
  readonly isActive: boolean
}

/** Lo que el admin edita de un extra. El precio llega en centavos: lo parsea la acción. */
export function leerExtra(input: { name: string; priceCents: number; effect: string; amount: string; isActive: boolean }):
  | { ok: true; valor: { name: string; priceCents: number; effect: EfectoDeExtra; amount: number; isActive: boolean } }
  | { ok: false; mensaje: string } {
  const name = input.name.trim()
  if (name.length === 0 || name.length > 80) return { ok: false, mensaje: 'El extra necesita un nombre de hasta 80 caracteres.' }
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) return { ok: false, mensaje: 'Revisa el precio.' }
  if (!EFECTOS_DE_EXTRA.includes(input.effect as EfectoDeExtra)) return { ok: false, mensaje: 'Elige qué hace el extra.' }
  const amount = input.amount.trim() === '' ? 0 : Number(input.amount)
  if (!Number.isInteger(amount) || amount < 0 || amount > 10_000) return { ok: false, mensaje: 'La cantidad es un número entero.' }
  return { ok: true, valor: { name, priceCents: input.priceCents, effect: input.effect as EfectoDeExtra, amount, isActive: input.isActive } }
}

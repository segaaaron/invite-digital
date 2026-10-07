import { diseno, events, orders } from '@/app/composition/container'
import { puedeRepartir } from '@/modules/events'

// Sin `'use server'` a propósito: son comprobaciones que usan las acciones, no acciones. En un
// fichero de servidor, exportarlas las convertiría en extremos HTTP públicos.

/**
 * Diseño por encargo: se reparte con la versión **aprobada** y el **saldo pagado** («pagas el saldo
 * y la compartes»). Un evento de autoservicio no tiene encargo y pasa. `null` si se puede repartir.
 *
 * **Sin cliente no aplica** (6 de octubre): quien aprueba la versión es el cliente, y un evento que
 * lleva el atelier no tiene a nadie que la apruebe; el reparto se quedaba bloqueado para siempre.
 */
export const encargoSinTerminar = async (eventId: string): Promise<string | null> => {
  if ((await events.staff.listWithEmail(eventId, 'cliente')).length === 0) return null
  const encargo = await diseno.leer(eventId)
  const saldoPendiente = encargo === null ? false : await orders.saldoPendienteDe(eventId)
  if (puedeRepartir(encargo, { saldoPendiente })) return null
  return encargo?.estado !== 'aprobada'
    ? 'Tu invitación se reparte cuando apruebes la versión final. Revísala en «Personalizar invitación».'
    : 'Falta registrar el saldo de tu plan: en cuanto lo recibamos, ya puedes repartirla.'
}


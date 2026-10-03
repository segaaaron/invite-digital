import { diseno, events, orders } from '@/app/composition/container'
import { loQueFaltaParaInvitar, pideNombres, puedeRepartir } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { isErr } from '@/shared/result'

// Sin `'use server'` a propósito: son comprobaciones que usan las acciones, no acciones. En un
// fichero de servidor, exportarlas las convertiría en extremos HTTP públicos.

/**
 * Sin la invitación escrita —quién, cuándo y dónde— no se invita a nadie: el invitado abriría
 * una invitación que no dice de quién es. La pantalla ya apaga los botones; esto es el corte
 * de verdad, porque cada acción es un extremo HTTP público. `null` si está lista.
 */
export const invitacionSinEscribir = async (eventId: string): Promise<string | null> => {
  // Qué hace falta depende del diseño: hay portadas que traen el nombre rotulado dentro y
  // no ofrecen ese campo, y exigirlo dejaría su reparto bloqueado sin nada que rellenar.
  const evento = await events.getByIdUnscoped(eventId)
  const tema = themeFor(isErr(evento) ? '' : evento.value.themeKey)
  const falta = loQueFaltaParaInvitar(await events.contentFor(eventId, {}), { pideNombres: pideNombres(tema) })
  return falta.length === 0 ? null : `Antes de invitar, termina tu invitación en Configuración. Falta: ${falta.join(', ').toLowerCase()}.`
}

/**
 * Diseño por encargo: se reparte con la versión **aprobada** y el **saldo pagado** («pagas el saldo
 * y la compartes»). Un evento de autoservicio no tiene encargo y pasa. `null` si se puede repartir.
 */
export const encargoSinTerminar = async (eventId: string): Promise<string | null> => {
  const encargo = await diseno.leer(eventId)
  const saldoPendiente = encargo === null ? false : await orders.saldoPendienteDe(eventId)
  if (puedeRepartir(encargo, { saldoPendiente })) return null
  return encargo?.estado !== 'aprobada'
    ? 'Tu invitación se reparte cuando apruebes la versión final. Revísala en «Personalizar invitación».'
    : 'Falta registrar el saldo de tu plan: en cuanto lo recibamos, ya puedes repartirla.'
}


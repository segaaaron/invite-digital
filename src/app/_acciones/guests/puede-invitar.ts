import { events } from '@/app/composition/container'
import { fiestaDeTema, loQueFaltaParaInvitar, requisitosParaInvitar } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducir } from '@/shared/i18n/en-ingles'

// Sin `'use server'` a propósito: son comprobaciones que usan las acciones, no acciones. En un
// fichero de servidor, exportarlas las convertiría en extremos HTTP públicos.

/**
 * Lo que frena el reparto, dicho para quien envía; `null` si se puede repartir.
 *
 * **Solo quién celebra y sus papás** (`loQueFaltaParaInvitar`, 13 oct). Lo demás sale con el ejemplo
 * del diseño. Ya **no frenan el encargo sin aprobar ni el saldo**: el admin crea el evento cuando ya se
 * pagó, y ese freno dejó invitaciones sin poder enviarse en producción.
 */
export const faltaParaEnviar = async (eventId: string): Promise<string | null> => {
  const evento = await events.getByIdUnscoped(eventId)
  if (isErr(evento)) return null
  const falta = loQueFaltaParaInvitar(await events.contenidoEscrito(eventId), requisitosParaInvitar(themeFor(evento.value.themeKey), fiestaDeTema(evento.value.themeKey)))
  if (falta.length === 0) return null
  const t = await tr()
  const lista = (separador: string) => falta.map((f) => traducir(f, t)).map((f) => f.charAt(0).toLowerCase() + f.slice(1)).join(separador)
  return t(`Para enviarla falta ${lista(' y ')}. Escríbelo en «Personalizar invitación».`, `To send it you still need ${lista(' and ')}. Write it in “Customize invitation”.`)
}

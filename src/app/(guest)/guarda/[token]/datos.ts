import { cache } from 'react'
import { events } from '@/app/composition/container'
import type { Event } from '@/modules/events'
import { tarjetaDeInvitacion, type TarjetaDeInvitacion } from '@/modules/events/domain/tarjeta-de-invitacion'
import type { InvitationContent } from '@/modules/events'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'

export type SaveTheDate = { readonly event: Event; readonly contenido: InvitationContent; readonly tarjeta: TarjetaDeInvitacion }

/**
 * El evento de un «save the date» y lo que enseña: nombres y fecha de la portada escrita. Sin
 * contenido escrito, el título del evento. `null` si el enlace no existe o se quitó.
 */
export const leerSaveTheDate = cache(async (token: string): Promise<SaveTheDate | null> => {
  const eventId = await events.saveTheDate.resolver(token)
  if (eventId === null) return null
  const evento = await events.getByIdUnscoped(eventId)
  if (isErr(evento)) return null
  const contenido = await events.contenidoParaInvitados(eventId, {})
  const base = tarjetaDeInvitacion({ evento: evento.value, contenido, invitado: '', protegida: false })
  const textos = getDictionary(evento.value.locale).saveTheDate
  const tarjeta = { ...base, antetitulo: textos.eyebrow, descripcion: textos.shareDescription.replace('{fecha}', base.fecha ?? evento.value.eventDate) }
  return { event: evento.value, contenido, tarjeta }
})

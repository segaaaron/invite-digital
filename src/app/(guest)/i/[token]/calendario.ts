import type { Event, InvitationContent } from '@/modules/events'
import type { EventoDeCalendario } from '@/shared/calendario/ics'

/** ponytail: la fiesta dura cinco horas en el calendario; nadie escribe la hora de fin. Pedirla si molesta. */
const DURACION_MIN = 300

/**
 * El evento tal como lo guarda el calendario del invitado: la fecha y hora escritas en la invitación (sin
 * ellas, el día entero del evento), la recepción como lugar y el enlace para volver a la invitación. Solo
 * con lo **escrito**: el contenido de muestra del diseño traería una fecha y un salón inventados.
 */
export function eventoDeLaInvitacion(event: Pick<Event, 'id' | 'title' | 'eventDate'>, escrito: InvitationContent, url: string): EventoDeCalendario {
  const recepcion = escrito.reception
  const lugar = [recepcion?.place, recepcion?.address].filter((t): t is string => typeof t === 'string' && t.trim() !== '').join(', ')
  const inicio = escrito.schedule?.startsAt?.slice(0, 16)
  return {
    uid: `evento-${event.id}@luxuryatelier.net`,
    inicio: inicio !== undefined && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(inicio) ? inicio : event.eventDate,
    minutos: DURACION_MIN,
    titulo: event.title,
    lugar: lugar || null,
    url,
  }
}

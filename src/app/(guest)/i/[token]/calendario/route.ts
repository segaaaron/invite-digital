import { events as eventos } from '@/app/composition/container'
import { eventUnlocked } from '@/app/_acciones/events/actions'
import { invitationUrl } from '@/modules/guests'
import { calendarioIcs, respuestaIcs } from '@/shared/calendario/ics'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'
import { eventoDeLaInvitacion } from '../calendario'
import { resolveInvitation } from '../invitation'
import { themeFor } from '@/modules/events/ui/themes/registry'

export const dynamic = 'force-dynamic'

/** «Agregar a mi calendario»: el `.ics` del evento, con la misma puerta que la invitación. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitacion = await resolveInvitation(token)
  if (isErr(invitacion)) return new Response('No encontrado', { status: 404 })
  const { event } = invitacion.value
  if (!(await eventUnlocked(event.id))) return new Response('No encontrado', { status: 404 })
  const escrito = await eventos.contenidoParaInvitados(event.id, themeFor(event.themeKey).defaultContent, event.eventDate)
  const evento = eventoDeLaInvitacion(event, escrito, invitationUrl(token, env.SITE_URL))
  return respuestaIcs(calendarioIcs(event.title, [evento], new Date()), 'evento.ics')
}

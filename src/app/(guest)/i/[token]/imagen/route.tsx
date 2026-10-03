import { events } from '@/app/composition/container'
import { imagenDeTarjeta } from '@/app/_compartir/imagen-de-tarjeta'
import { tarjetaDeInvitacion } from '@/modules/events/domain/tarjeta-de-invitacion'
import { isErr } from '@/shared/result'
import { resolveInvitation } from '../invitation'

/**
 * La imagen que WhatsApp enseña al pegar el enlace de una invitación: el arte de portada del
 * diseño a sangre, con los nombres y la fecha encima.
 *
 * JPEG y no PNG: WhatsApp deja sin imagen las vistas previas pesadas, y una foto en PNG pasa de
 * medio mega. Con contraseña, solo el diseño y «Tienes una invitación».
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitacion = await resolveInvitation(token)
  if (isErr(invitacion)) return new Response('No encontrada', { status: 404 })
  const { event, group } = invitacion.value

  const protegida = (await events.passwordHashOf(event.id)) !== null
  const contenido = protegida ? {} : await events.contenidoParaInvitados(event.id, {})
  const tarjeta = tarjetaDeInvitacion({ evento: event, contenido, invitado: group.label, protegida })
  return imagenDeTarjeta(event, tarjeta)
}

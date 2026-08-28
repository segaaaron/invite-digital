import { notFound } from 'next/navigation'
import { events } from '@/app/composition/container'
import { eventUnlocked } from '@/modules/events/actions'

/**
 * Sirve una imagen de una invitación.
 *
 * **Sin sesión, y es a propósito**: quien la mira es un invitado, y nunca va a tener una.
 * Lo que la protege es que el identificador es un UUID que no está publicado en ninguna
 * parte y que solo aparece dentro de una invitación a la que ya se llegó por su token.
 *
 * **Con la misma puerta que la invitación.** Si el evento lleva contraseña y la cookie de
 * desbloqueo no está, responde 404. Un `<img>` no puede ser el agujero por el que se rodea
 * el candado, igual que `respondAction` no podía serlo: la puerta cierra las lecturas, no
 * solo el render.
 *
 * Un identificador desconocido responde **404, nunca 403**: un 403 confirmaría que esa
 * imagen existe.
 *
 * `Cache-Control: private`. Nunca `public`: una imagen de un evento con contraseña no
 * puede quedarse en una caché compartida, donde la serviría sin volver a preguntar.
 */
export const dynamic = 'force-dynamic'

export async function GET(_peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const imagen = await events.media.read(id)
  if (imagen === null) notFound()

  if (!(await eventUnlocked(imagen.eventId))) notFound()

  return new Response(imagen.bytes as BodyInit, {
    headers: {
      'Content-Type': imagen.contentType,
      'Content-Length': String(imagen.bytes.byteLength),
      'Cache-Control': 'private, max-age=3600',
      // Sin `Content-Disposition: attachment`, al revés que el comprobante: esta imagen se
      // pinta dentro de la invitación, no se descarga.
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

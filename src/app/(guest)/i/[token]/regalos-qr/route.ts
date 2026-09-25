import { registry } from '@/app/composition/container'
import { eventUnlocked } from '@/app/_acciones/events/actions'
import { isErr } from '@/shared/result'
import { resolveInvitation } from '../invitation'

export const dynamic = 'force-dynamic'

/**
 * El QR del banco para regalar por transferencia, a quien tiene la invitación. Misma puerta que
 * la invitación: enlace válido y, si el evento tiene contraseña, desbloqueado. Con la
 * transferencia apagada no se sirve, aunque la imagen siga guardada.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitacion = await resolveInvitation(token)
  if (isErr(invitacion)) return new Response('No encontrado', { status: 404 })
  const { event } = invitacion.value
  if (!(await eventUnlocked(event.id))) return new Response('No encontrado', { status: 404 })

  const formas = await registry.formas(event.id)
  const qr = formas.transferencia ? await registry.qrDeRegalos(event.id) : null
  if (qr === null) return new Response('No encontrado', { status: 404 })

  return new Response(Buffer.from(qr.bytes), {
    headers: {
      'Content-Type': qr.tipo,
      // Datos bancarios de alguien: ni cachés compartidas ni indexar.
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  })
}

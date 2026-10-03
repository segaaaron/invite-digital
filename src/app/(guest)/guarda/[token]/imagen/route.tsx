import { imagenDeTarjeta } from '@/app/_compartir/imagen-de-tarjeta'
import { leerSaveTheDate } from '../datos'

/** La imagen de la vista previa en WhatsApp del «save the date»: la de la invitación, con «Reserva la fecha». */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const datos = await leerSaveTheDate((await params).token)
  if (datos === null) return new Response('No encontrado', { status: 404 })
  return imagenDeTarjeta(datos.event, datos.tarjeta)
}

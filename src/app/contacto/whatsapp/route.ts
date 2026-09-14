import { NextResponse } from 'next/server'
import { site } from '@/app/composition/container'
import { enlaceWhatsapp } from '@/shared/whatsapp'

/**
 * Redirige al WhatsApp vigente de «La web».
 *
 * Existe para lo que no puede leer la base: la página de error de una invitación es un
 * componente de cliente y no recibe props del servidor. Enlaza aquí y siempre llega al
 * número que el admin tiene configurado hoy, no al que se compiló.
 *
 * 302 y nunca 301: el número cambia, y un permanente lo cachearía el navegador para siempre.
 * Sin número configurado, a la portada.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const ajustes = await site.settings()
  const destino = enlaceWhatsapp(ajustes.whatsapp, ajustes.mensajes.general.es)
  return NextResponse.redirect(destino ?? new URL('/', request.url), 302)
}

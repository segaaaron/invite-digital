import { NextResponse } from 'next/server'
import { site } from '@/app/composition/container'
import { env } from '@/shared/config/env'
import { enlaceWhatsapp } from '@/shared/whatsapp'

/**
 * Redirige al WhatsApp vigente de «La web».
 *
 * Existe para lo que no puede leer la base: la página de error de una invitación es un
 * componente de cliente y no recibe props del servidor. Enlaza aquí y siempre llega al
 * número que el admin tiene configurado hoy, no al que se compiló.
 *
 * 302 y nunca 301: el número cambia, y un permanente lo cachearía el navegador para siempre.
 * Sin número configurado, a la portada **pública** (`SITE_URL`): detrás del proxy, `request.url`
 * es la dirección interna del contenedor y mandaba a `https://0.0.0.0:3000/`.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const ajustes = await site.settings()
  const destino = enlaceWhatsapp(ajustes.whatsapp, ajustes.mensajes.general.es)
  return NextResponse.redirect(destino ?? new URL('/', env.SITE_URL), 302)
}

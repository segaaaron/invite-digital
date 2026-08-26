import { NextResponse } from 'next/server'
import { qr } from '@/app/composition/container'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/**
 * La redirección de un QR. **Pública y sin sesión**, como el enlace del invitado: quien
 * escanea un cartel en el salón no tiene cuenta.
 *
 * Un código apagado o inexistente responde **404**, no una redirección a la portada:
 * quien escanea un cartel viejo tiene que enterarse de que ya no vale, y quien prueba
 * identificadores al azar no debe averiguar cuáles existieron.
 *
 * El destino se validó al guardarlo —solo `http`, `https` o una ruta interna—, así que
 * aquí no puede aparecer un `javascript:`. Se vuelve a componer contra `SITE_URL` cuando
 * es interno para que el `Location` sea siempre absoluto.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const resuelto = await qr.resolve(id)
  if (isErr(resuelto)) {
    if (resuelto.error.kind === 'not_found') return new NextResponse('Este código ya no está disponible', { status: 404 })
    throw new Error(resuelto.error.detail)
  }

  const destino = resuelto.value.target
  const absoluto = destino.startsWith('/') ? `${env.SITE_URL.replace(/\/+$/, '')}${destino}` : destino

  // 302 y no 301: un permanente lo cachea el navegador para siempre, y entonces cambiar
  // el destino desde el panel no sirve de nada para quien ya lo escaneó. Que el motor
  // exista es justamente para poder cambiarlo.
  return NextResponse.redirect(absoluto, { status: 302, headers: { 'Cache-Control': 'no-store' } })
}

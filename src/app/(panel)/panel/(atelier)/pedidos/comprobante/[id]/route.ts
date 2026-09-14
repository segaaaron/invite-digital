import { NextResponse } from 'next/server'
import { orders } from '@/app/composition/container'
import { requireAdmin } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/**
 * Sirve un comprobante de pago. **Solo al admin.**
 *
 * El fichero no vive en `public/` porque ahí estaría publicado en internet, y un
 * comprobante de transferencia lleva el nombre, el banco y el número de cuenta de una
 * persona. Por eso tampoco basta con tener sesión: los pedidos del Plan B son del admin,
 * y un atelier no tiene nada que hacer con los datos bancarios de los clientes de otro.
 *
 * Tres cabeceras, y las tres importan:
 *
 * - `Content-Disposition: attachment` — el fichero se descarga, no se pinta. Un PDF
 *   servido en línea desde el mismo origen que el panel puede ejecutar guion.
 * - `Content-Security-Policy: sandbox` — y si algún navegador lo pinta igual, lo hace sin
 *   guion, sin formularios y en un origen opaco.
 * - `X-Content-Type-Options: nosniff` — el navegador no reinterpreta el tipo por su
 *   cuenta.
 *
 * El nombre del fichero en la descarga se limpia a un juego de caracteres seguro: el
 * original lo escribió quien subió el fichero, y unas comillas dentro de la cabecera la
 * partirían en dos.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireAdmin()

  const { id } = await context.params
  const leido = await orders.readProof(id)

  if (isErr(leido)) {
    // 404 también cuando el fichero falta del almacén: distinguirlo no le sirve a nadie
    // que tenga sesión y sí describiría el estado interno a quien no debería.
    if (leido.error.kind === 'not_found') return new NextResponse('No encontrado', { status: 404 })
    throw new Error(leido.error.detail)
  }

  const { proof, bytes } = leido.value
  const nombre = proof.originalName.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120) || 'comprobante'

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': proof.mime,
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Content-Security-Policy': 'sandbox',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}

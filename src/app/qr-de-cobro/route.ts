import { NextResponse } from 'next/server'
import { admin } from '@/app/composition/container'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

const TIPO: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }

/**
 * Sirve la imagen del QR de cobro. **Sin sesión, y a propósito.**
 *
 * Es la única cosa del almacén que se sirve en abierto, y la diferencia con los
 * comprobantes es toda: un comprobante lleva el nombre y la cuenta de un cliente; este QR
 * está hecho para que lo vea y lo escanee quien va a pagar. Esconderlo tras una sesión lo
 * volvería inútil.
 *
 * El fichero vive fuera de `public/` igualmente, porque quien lo sube lo cambia desde el
 * panel y `public/` no se escribe en tiempo de ejecución dentro de la imagen.
 */
export async function GET() {
  const ajustes = await admin.payment()
  if (isErr(ajustes) || ajustes.value.qrImageKey === null) {
    return new NextResponse('Sin QR de cobro', { status: 404 })
  }

  // La clave se guardó como `<uuid>.<extensión>`: el uuid nombra el fichero y la
  // extensión recuerda su tipo, para servirlo sin volver a olfatear los bytes.
  const [key, extension] = ajustes.value.qrImageKey.split('.')
  if (key === undefined || extension === undefined) return new NextResponse('Sin QR de cobro', { status: 404 })

  const bytes = await admin.readFile(key)
  if (bytes === null) return new NextResponse('Sin QR de cobro', { status: 404 })

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': TIPO[extension] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      // Corto a propósito: cambiar el QR desde el panel tiene que verse enseguida en la
      // página del pedido, no cuando caduque una caché de un día.
      'Cache-Control': 'public, max-age=60',
    },
  })
}

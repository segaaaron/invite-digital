import { events, registry } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/** El QR que subió el cliente, para verlo en su panel. Misma sección que la página de Regalos. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) return new Response('No encontrado', { status: 404 })
  const qr = await registry.qrDeRegalos(event.value.id)
  if (qr === null) return new Response('No encontrado', { status: 404 })
  return new Response(Buffer.from(qr.bytes), {
    headers: { 'Content-Type': qr.tipo, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}

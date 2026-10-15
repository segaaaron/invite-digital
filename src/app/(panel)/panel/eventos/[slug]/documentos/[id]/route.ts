import { events, planner, plans } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { isErr } from '@/shared/result'
import { tr } from '@/shared/i18n/idioma-servidor'

/**
 * Descarga un documento privado del evento. Tras la sesión y la sección de quien celebra,
 * como adjunto y con `CSP: sandbox`: un PDF servido en línea desde el origen del panel puede
 * ejecutar guion. Mismo trato que los comprobantes del Plan B. De otro evento, 404.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const t = await tr()
  const actor = await requireSession()
  const { slug, id } = await params
  const evento = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(evento)) return new Response(t('No encontrado', 'Not found'), { status: 404 })
  if (isErr(await plans.requireFeature(evento.value.id, 'plannerCompleto'))) return new Response(t('No encontrado', 'Not found'), { status: 404 })

  const doc = await planner.dia.readDocument(evento.value.id, id)
  if (doc === null) return new Response(t('No encontrado', 'Not found'), { status: 404 })

  const nombre = doc.originalName.replace(/["\r\n]/g, '')
  return new Response(Buffer.from(doc.bytes), {
    headers: {
      'Content-Type': doc.contentType,
      'Content-Length': String(doc.bytes.byteLength),
      'Content-Disposition': `attachment; filename="${nombre}"; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
      'Content-Security-Policy': 'sandbox',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  })
}

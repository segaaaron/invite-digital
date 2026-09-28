import { events } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import type { TipoDeCambio } from '@/shared/db/cambios-en-vivo'
import { respuestaDeCambios } from '@/shared/http/sse-de-cambios'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SOLO_INGRESOS: ReadonlySet<TipoDeCambio> = new Set(['ingreso'])

/**
 * Los ingresos del evento que se celebra hoy, para el contador de «Hoy» del admin. Solo el
 * aviso de que alguien entró —el SSE nunca lleva datos—: lo que se repinta es un recuento, sin
 * un solo nombre, así que el admin sigue sin ver la lista de invitados de una boda.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin()
  const { slug } = await params
  const evento = await events.getBySlugUnscoped(slug)
  if (isErr(evento)) return new Response('No encontrado', { status: 404 })
  return respuestaDeCambios(request, evento.value.id, SOLO_INGRESOS)
}

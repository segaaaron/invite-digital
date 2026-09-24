import { events } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import type { TipoDeCambio } from '@/shared/db/cambios-en-vivo'
import { respuestaDeCambios } from '@/shared/http/sse-de-cambios'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TODO: ReadonlySet<TipoDeCambio> = new Set(['rsvp', 'ingreso', 'visita'])
const SOLO_INGRESOS: ReadonlySet<TipoDeCambio> = new Set(['ingreso'])

/**
 * Los cambios de un evento, en vivo (SSE). Misma guardia que sus páginas: quien abre la
 * sección del anfitrión —dueño, anfitrión, planner— recibe todo; quien solo abre el ingreso
 * —el personal de puerta con cuenta— solo los ingresos. Nadie más: 404, como un evento ajeno.
 * El admin no ve los datos de una boda y tampoco escucha sus cambios.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

  const completo = await events.getFor(actor, slug, { section: 'cliente' })
  if (!isErr(completo)) return respuestaDeCambios(request, completo.value.id, TODO)

  const puerta = await events.getFor(actor, slug, { section: 'checkin' })
  if (!isErr(puerta)) return respuestaDeCambios(request, puerta.value.id, SOLO_INGRESOS)

  return new Response('No encontrado', { status: 404 })
}

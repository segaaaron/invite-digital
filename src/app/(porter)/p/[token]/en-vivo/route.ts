import { cookies } from 'next/headers'
import { plans, porters } from '@/app/composition/container'
import type { TipoDeCambio } from '@/shared/db/cambios-en-vivo'
import { respuestaDeCambios } from '@/shared/http/sse-de-cambios'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SOLO_INGRESOS: ReadonlySet<TipoDeCambio> = new Set(['ingreso'])

/**
 * Los ingresos del evento del portero, en vivo: con dos o tres puertas, cada tablet ve lo que
 * registran las otras. Misma guardia que su puerta —su cookie, su acceso vigente (quitado o
 * fuera de la ventana del día, se cierra) y el plan con modo puerta—. Solo ingresos: el portero
 * no ve respuestas ni visitas.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if ((await cookies()).get('door_porter')?.value !== token) return new Response('No encontrado', { status: 404 })

  const portero = await porters.resolve(token)
  if (isErr(portero)) return new Response('No encontrado', { status: 404 })
  if (isErr(await plans.requireFeature(portero.value.eventId, 'checkin'))) return new Response('No encontrado', { status: 404 })

  return respuestaDeCambios(request, portero.value.eventId, SOLO_INGRESOS)
}

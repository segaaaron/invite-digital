import { cookies } from 'next/headers'
import { plans, porters } from '@/app/composition/container'
import type { TipoDeCambio } from '@/shared/db/cambios-en-vivo'
import { respuestaDeCambios } from '@/shared/http/sse-de-cambios'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** El portero no ve respuestas ni visitas: solo lo que mueve su lista. */
const LO_DE_LA_PUERTA: ReadonlySet<TipoDeCambio> = new Set<TipoDeCambio>(['ingreso', 'invitado'])

/**
 * Los ingresos del evento del portero, en vivo: con dos o tres puertas, cada tablet ve lo que
 * registran las otras. Misma guardia que su puerta —su cookie, su acceso vigente (quitado o
 * fuera de la ventana del día, se cierra) y el plan con modo puerta—. Ingresos y, desde la
 * `0096`, `invitado`: revocar o devolver una invitación tiene que llegar a la tablet sin que
 * nadie recargue. Nada más: el portero no ve respuestas ni visitas.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // La sesión firmada tras el PIN, atada a este enlace; el token de la URL no basta.
  const sesion = (await cookies()).get('door_porter')?.value
  if (sesion === undefined) return new Response('No encontrado', { status: 404 })

  const portero = await porters.resolveDelEnlace({ cookie: sesion, token })
  if (isErr(portero)) return new Response('No encontrado', { status: 404 })
  if (isErr(await plans.requireFeature(portero.value.eventId, 'checkin'))) return new Response('No encontrado', { status: 404 })

  return respuestaDeCambios(request, portero.value.eventId, LO_DE_LA_PUERTA)
}

import { requireSession } from '@/app/_acciones/sesion'
import type { TipoDeCambio } from '@/shared/db/cambios-en-vivo'
import { respuestaDeCambios } from '@/shared/http/sse-de-cambios'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const AVISOS: ReadonlySet<TipoDeCambio> = new Set(['aviso'])

/** La campana en vivo (SSE): cada aviso nuevo de la persona de la sesión (`0074`). Solo el suyo. */
export async function GET(request: Request) {
  const actor = await requireSession()
  return respuestaDeCambios(request, `u:${actor.userId}`, AVISOS)
}

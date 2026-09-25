import { requireAdmin } from '@/app/_acciones/sesion'
import { CAMBIOS_DEL_ADMIN, type TipoDeCambio } from '@/shared/db/cambios-en-vivo'
import { respuestaDeCambios } from '@/shared/http/sse-de-cambios'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEL_ADMIN: ReadonlySet<TipoDeCambio> = new Set(['consulta', 'pedido'])

/** La campana del admin (SSE): consultas nuevas y pedidos que cambian. Quien no es admin, 404. */
export async function GET(request: Request) {
  await requireAdmin()
  return respuestaDeCambios(request, CAMBIOS_DEL_ADMIN, DEL_ADMIN)
}

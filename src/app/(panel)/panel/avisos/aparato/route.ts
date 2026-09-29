import { activarAparatoAction } from '@/app/_acciones/notifications/avisos-actions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * El Service Worker guarda aquí la suscripción que el navegador renovó (`pushsubscriptionchange`). Va con
 * la cookie de la sesión: la acción exige sesión y guarda el aparato a nombre de quien la tiene.
 */
export async function POST(request: Request) {
  const cuerpo: unknown = await request.json().catch(() => null)
  if (cuerpo === null || typeof cuerpo !== 'object') return new Response(null, { status: 400 })
  const r = await activarAparatoAction(cuerpo as Parameters<typeof activarAparatoAction>[0])
  return new Response(null, { status: r.ok ? 204 : 400 })
}

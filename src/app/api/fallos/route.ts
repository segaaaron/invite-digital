import { guardarFallo } from '@/shared/observability/fallos'
import { clientIpFrom } from '@/shared/http/client-ip'
import { createRateLimiter } from '@/shared/http/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Diez por minuto e IP: un bucle de errores en un navegador no llena la tabla. */
const limite = createRateLimiter({ windowMs: 60_000, max: 10 })

/**
 * Los fallos **del navegador** (un error de JavaScript en el panel o en la invitación de un invitado) van
 * al mismo registro que los del servidor. Público —el invitado no tiene sesión—, con límite por IP y
 * tamaños acotados. No guarda nada del invitado: el mensaje, la pila y la ruta.
 */
export async function POST(request: Request) {
  const ip = clientIpFrom({ realIp: request.headers.get('x-real-ip'), forwardedFor: request.headers.get('x-forwarded-for') })
  if (limite.isLimited(ip, Date.now())) return new Response(null, { status: 429 })
  const cuerpo = (await request.json().catch(() => null)) as { mensaje?: unknown; pila?: unknown; ruta?: unknown } | null
  if (cuerpo === null || typeof cuerpo.mensaje !== 'string' || cuerpo.mensaje.trim() === '') return new Response(null, { status: 400 })
  const error = new Error(cuerpo.mensaje.slice(0, 500))
  error.stack = typeof cuerpo.pila === 'string' ? cuerpo.pila.slice(0, 6000) : error.message
  await guardarFallo({
    servicio: 'navegador',
    origen: 'navegador',
    partes: [error],
    ruta: typeof cuerpo.ruta === 'string' ? cuerpo.ruta.slice(0, 400) : null,
    accion: null,
  }).catch((causa: unknown) => console.error('[fallos] no se pudo guardar el fallo del navegador:', causa))
  return new Response(null, { status: 204 })
}

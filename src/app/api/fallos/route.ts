import { esCorteDelCliente, guardarFallo, huellaDe } from '@/shared/observability/fallos'
import { cuboDeLaPeticion } from '@/shared/http/client-ip'
import { createRateLimiter } from '@/shared/http/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Diez por minuto y **por cubo de IP**: con la dirección completa no limitaba nada, porque a
 * cualquiera le dan una /64 de IPv6 entera y rotarla es gratis (F7).
 */
const limite = createRateLimiter({ windowMs: 60_000, max: 10 })

/**
 * Y dos por minuto **del mismo fallo**, venga de donde venga.
 *
 * Un error dentro de un `useEffect` se repite en bucle y cada vuelta es una fila de varios
 * kilobytes que vive treinta días: el registro se llenaba de la misma línea mil veces, que es
 * justo cuando deja de servir para leerlo. Los fallos **distintos** siguen entrando todos.
 */
const limitePorFallo = createRateLimiter({ windowMs: 60_000, max: 2 })

/**
 * Los fallos **del navegador** (un error de JavaScript en el panel o en la invitación de un invitado) van
 * al mismo registro que los del servidor. Público —el invitado no tiene sesión—, con límite por IP y
 * tamaños acotados. No guarda nada del invitado: el mensaje, la pila y la ruta.
 */
export async function POST(request: Request) {
  const ip = cuboDeLaPeticion({ realIp: request.headers.get('x-real-ip'), forwardedFor: request.headers.get('x-forwarded-for') })
  if (limite.isLimited(ip, Date.now())) return new Response(null, { status: 429 })
  const cuerpo = (await request.json().catch(() => null)) as { mensaje?: unknown; pila?: unknown; ruta?: unknown } | null
  if (cuerpo === null || typeof cuerpo.mensaje !== 'string' || cuerpo.mensaje.trim() === '') return new Response(null, { status: 400 })
  const mensaje = cuerpo.mensaje.slice(0, 500)
  const error = new Error(mensaje)
  // 3000 y no 6000: la pila de un navegador cabe de sobra, y es lo que pesa cada fila.
  error.stack = typeof cuerpo.pila === 'string' ? cuerpo.pila.slice(0, 3000) : error.message
  // Sin red en el aparato del invitado no es un fallo nuestro: no se anota.
  if (esCorteDelCliente(error)) return new Response(null, { status: 204 })
  // La misma huella que agrupa el panel: dos filas por minuto del mismo fallo bastan para saber
  // que está pasando, y es lo que impide que un bucle entierre todo lo demás.
  if (limitePorFallo.isLimited(huellaDe('navegador', mensaje), Date.now())) return new Response(null, { status: 204 })
  await guardarFallo({
    servicio: 'navegador',
    origen: 'navegador',
    partes: [error],
    ruta: typeof cuerpo.ruta === 'string' ? cuerpo.ruta.slice(0, 400) : null,
    accion: null,
  }).catch((causa: unknown) => console.error('[fallos] no se pudo guardar el fallo del navegador:', causa))
  return new Response(null, { status: 204 })
}

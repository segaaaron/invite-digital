import { asistente } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { accesoAlAsistente } from '../../../_carcasa/asistente'
import { leerHistorial } from '@/modules/asistente/domain/historial'
import { idiomaDe, MENSAJE_DE_CIERRE, puedeConversar, type Salida } from '@/modules/asistente'
import { createRateLimiter } from '@/shared/http/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Diez mensajes por minuto y persona: nadie escribe más rápido, y un bucle no vacía la cuota. */
const limite = createRateLimiter({ windowMs: 60_000, max: 10 })

/**
 * **Luxury responde**, en trozos: una línea JSON por evento (`application/x-ndjson`), que el panel va
 * pintando según llegan. Route handler y no Server Action porque devuelve un flujo.
 *
 * Las guardias van en orden y todas en el servidor: sesión → evento propio con su plan (`accesoAlAsistente`;
 * si no, 404 como un evento ajeno) → límite por minuto → conversación válida → cuota del evento y techo
 * del mes. El evento sale de la sesión y de la dirección, **nunca** del modelo ni del cuerpo.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const acceso = await accesoAlAsistente(actor, slug)
  if (acceso === null) return new Response('No encontrado', { status: 404 })

  if (limite.isLimited(actor.userId, Date.now())) return new Response('Demasiados mensajes seguidos', { status: 429 })

  const cuerpo = (await request.json().catch(() => null)) as { mensajes?: unknown; idioma?: unknown; porVoz?: unknown } | null
  const mensajes = leerHistorial(cuerpo?.mensajes)
  if (mensajes === null) return new Response('Conversación no válida', { status: 400 })

  const ahora = new Date()
  const permiso = puedeConversar(acceso.config, acceso.capacidad.planSlug, await asistente.usoDe(acceso.evento.id, ahora), acceso.capacidad.asistente === true)
  const salidas: AsyncIterable<Salida> = permiso.ok
    ? asistente.responder({ evento: acceso.evento, capacidad: acceso.capacidad, nombreDelPlan: acceso.nombreDelPlan, rol: acceso.rol, mensajes, ahora, idioma: idiomaDe(cuerpo?.idioma), porVoz: cuerpo?.porVoz === true })
    : (async function* () {
        yield { tipo: 'texto', delta: permiso.motivo === 'fuera_del_plan' ? MENSAJE_DE_CIERRE.presupuesto : MENSAJE_DE_CIERRE[permiso.motivo] }
        yield { tipo: 'fin' }
      })()

  const codificador = new TextEncoder()
  const flujo = new ReadableStream<Uint8Array>({
    async start(control) {
      for await (const salida of salidas) control.enqueue(codificador.encode(`${JSON.stringify(salida)}\n`))
      control.close()
    },
  })
  return new Response(flujo, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      // Sin `no-transform`, la compresión de Next retiene el flujo hasta el final (lo mismo que las SSE).
      'cache-control': 'no-store, no-transform',
    },
  })
}

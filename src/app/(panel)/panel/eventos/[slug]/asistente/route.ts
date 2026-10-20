import { asistente } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { accesoAlAsistente } from '../../../_carcasa/asistente'
import { leerHistorial, TURNOS_QUE_SE_MANDAN } from '@/modules/asistente/domain/historial'
import { idiomaDe, MENSAJE_DE_CIERRE, puedeConversar, type Salida } from '@/modules/asistente'
import { createRateLimiter } from '@/shared/http/rate-limit'
import { escribir } from './escritura'
import { tr } from '@/shared/i18n/idioma-servidor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Veinte mensajes por minuto y persona: un bucle no vacía la cuota. */
// 30 por minuto y persona (eran 10, luego 20): hablarle por voz son mensajes cortos y seguidos (7 de octubre). El gasto
// lo topan la cuota del mes del evento y el techo en dólares, no esto.
// Las e2e (un solo usuario para toda la suite) lo suben con `ASISTENTE_MENSAJES_POR_MINUTO`, como `ASISTENTE_MODELO`.
const limite = createRateLimiter({ windowMs: 60_000, max: Number(process.env.ASISTENTE_MENSAJES_POR_MINUTO) || 30 })

/**
 * **Luxury responde**, en trozos: una línea JSON por evento (`application/x-ndjson`), que el panel va
 * pintando según llegan. Route handler y no Server Action porque devuelve un flujo.
 *
 * Las guardias van en orden y todas en el servidor: sesión → evento propio con su plan (`accesoAlAsistente`;
 * si no, 404 como un evento ajeno) → límite por minuto → conversación válida → cuota del evento y techo
 * del mes. El evento sale de la sesión y de la dirección, **nunca** del modelo ni del cuerpo.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t = await tr()
  const actor = await requireSession()
  const { slug } = await params
  const acceso = await accesoAlAsistente(actor, slug)
  if (acceso === null) return new Response(t('No encontrado', 'Not found'), { status: 404 })

  if (limite.isLimited(actor.userId, Date.now())) return new Response(t('Demasiados mensajes seguidos', 'Too many messages in a row'), { status: 429 })

  const cuerpo = (await request.json().catch(() => null)) as { mensajes?: unknown; idioma?: unknown; porVoz?: unknown; destinos?: unknown } | null
  // Las pantallas de la barra de quien habla: «ir_a» solo lleva a esas. Del navegador, pero solo restringe.
  const destinos = Array.isArray(cuerpo?.destinos) ? cuerpo.destinos.filter((d): d is string => typeof d === 'string').slice(0, 80) : undefined
  const mensajes = leerHistorial(cuerpo?.mensajes)
  if (mensajes === null) return new Response(t('Conversación no válida', 'Invalid conversation'), { status: 400 })

  const ahora = new Date()
  const permiso = puedeConversar(acceso.config, acceso.capacidad.planSlug, await asistente.usoDe(acceso.evento.id, ahora), acceso.capacidad.asistente === true)
  const salidas: AsyncIterable<Salida> = permiso.ok
    ? asistente.responder({ evento: acceso.evento, capacidad: acceso.capacidad, nombreDelPlan: acceso.nombreDelPlan, rol: acceso.rol, abre: acceso.abre, mensajes, ahora, idioma: idiomaDe(cuerpo?.idioma), porVoz: cuerpo?.porVoz === true, ...(destinos ? { destinos } : {}), escribir, recortada: Array.isArray(cuerpo?.mensajes) && cuerpo.mensajes.length > TURNOS_QUE_SE_MANDAN })
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

import { asistente } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { primerEventoConLuxury } from '../../_carcasa/asistente'
import { leerHistorial } from '@/modules/asistente/domain/historial'
import { idiomaDe, MENSAJE_DE_CIERRE, puedeConversar } from '@/modules/asistente'
import { paraLeer } from '@/modules/asistente/ui/voz'
import { createRateLimiter } from '@/shared/http/rate-limit'
import { escribir } from '../../eventos/[slug]/asistente/escritura'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const limite = createRateLimiter({ windowMs: 60_000, max: 30 })

/** Siri lee lo que vuelve: siempre 200 y texto llano, también para decir que algo no se pudo. */
const decir = (texto: string) => new Response(texto, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })

/**
 * **«Oye Siri, Luxury»** (8 de octubre). El Atajo de Apple dicta lo que se dice y lo manda aquí con la llave de
 * quien lo instaló (`Authorization: Bearer`, solo vale en esta ruta: `llaveDelEncabezado`). Luxury responde
 * como en el panel —con las mismas guardias, cuota y acciones— sobre **el evento que viene** de esa cuenta, y
 * vuelve texto llano para que Siri lo lea. Sin historial: cada pregunta va sola.
 */
export async function POST(request: Request) {
  // Una llave que no vale hace que `requireSession` redirija a la puerta; cualquier otro fallo es nuestro.
  const sesion = await requireSession().then(
    (actor) => ({ actor }),
    (causa: unknown) => ({ redirige: typeof causa === 'object' && causa !== null && 'digest' in causa && String(causa.digest).startsWith('NEXT_REDIRECT') }),
  )
  if (!('actor' in sesion)) return decir(sesion.redirige ? 'Tu llave de Siri ya no vale. Crea una nueva en Mi cuenta, en el panel de Luxury Atelier.' : 'No pude responder ahora. Vuelve a intentarlo en un momento.')
  const { actor } = sesion
  if (limite.isLimited(actor.userId, Date.now())) return decir('Vas muy rápido. Espera un momento y vuelve a preguntarme.')

  // Lo dictado es una frase: un cuerpo grande no se lee a memoria.
  if (Number(request.headers.get('content-length') ?? 0) > 16_000) return decir('Eso fue muy largo. Dímelo más corto.')
  const cuerpo = (await request.json().catch(() => null)) as { texto?: unknown; idioma?: unknown } | null
  const texto = typeof cuerpo?.texto === 'string' ? cuerpo.texto.trim() : ''
  if (texto === '') return decir('No te escuché. Vuelve a decírmelo.')
  const mensajes = leerHistorial([{ rol: 'usuario', texto }])
  if (mensajes === null) return decir('Eso fue muy largo. Dímelo más corto.')

  const acceso = await primerEventoConLuxury(actor)
  if (acceso === null) return decir('Luxury no viene en el plan de tu evento. Puedes pedirlo como extra en el panel.')

  const ahora = new Date()
  const permiso = puedeConversar(acceso.config, acceso.capacidad.planSlug, await asistente.usoDe(acceso.evento.id, ahora), acceso.capacidad.asistente === true)
  if (!permiso.ok) return decir(permiso.motivo === 'fuera_del_plan' ? MENSAJE_DE_CIERRE.presupuesto : MENSAJE_DE_CIERRE[permiso.motivo])

  let respuesta = ''
  try {
    const salidas = asistente.responder({
      evento: acceso.evento,
      capacidad: acceso.capacidad,
      nombreDelPlan: acceso.nombreDelPlan,
      rol: acceso.rol,
      mensajes,
      ahora,
      idioma: idiomaDe(cuerpo?.idioma ?? request.headers.get('accept-language')),
      porVoz: true,
      canal: 'siri',
      escribir,
    })
    for await (const salida of salidas) {
      if (salida.tipo === 'texto') respuesta += salida.delta
      else if (salida.tipo === 'error') respuesta += ` ${salida.mensaje}`
      // Los botones de WhatsApp piden un toque: por Siri se dice dónde están.
      else if (salida.tipo === 'propuesta') respuesta += ' Te dejé los mensajes listos en Luxury, en el panel: ábrelo y toca enviar en cada uno.'
    }
  } catch {
    return decir('No pude responder ahora. Vuelve a intentarlo en un momento.')
  }
  return decir(paraLeer(respuesta) || 'Listo.')
}

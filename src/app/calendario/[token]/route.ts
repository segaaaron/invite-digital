import { events, identity, planner } from '@/app/composition/container'
import { parseRole } from '@/modules/identity'
import { NOMBRE_DE_CLASE, type EntradaDeAgenda } from '@/modules/planner'
import { calendarioIcs, respuestaIcs, type EventoDeCalendario } from '@/shared/calendario/ics'
import { env } from '@/shared/config/env'
import { isErr } from '@/shared/result'

export const dynamic = 'force-dynamic'

/**
 * **La suscripción `.ics` de la agenda** (`webcal://…/calendario/<token>`). Sin sesión: la pide la app de
 * calendario del teléfono, que no lleva cookies. El token dice de quién es, y **cada petición vuelve a
 * mirar si esa persona sigue entrando al evento** (sección `planner`): quitarle el acceso corta también su
 * calendario. Enlace desconocido o sin acceso: 404, sin distinguir.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const noEsta = () => new Response('No encontrado', { status: 404 })
  const suscripcion = await planner.dia.resolverSuscripcion(token.replace(/\.ics$/, ''))
  if (suscripcion === null) return noEsta()
  const fila = await identity.actorOf(suscripcion.userId)
  if (fila === null) return noEsta()
  const actor = { userId: fila.id, email: fila.email, role: parseRole(fila.role), mustChangePassword: fila.mustChangePassword }
  const evento = await events.getByIdFor(actor, suscripcion.eventId, { section: 'planner' })
  if (isErr(evento)) return noEsta()

  const base = `${env.SITE_URL.replace(/\/$/, '')}/panel/eventos/${evento.value.slug}`
  const entradas = (await planner.dia.agenda(evento.value)).filter((e) => !e.hecha)
  const aCalendario = (e: EntradaDeAgenda): EventoDeCalendario => ({
    uid: `${e.clase}-${e.id}-${evento.value.id}@luxuryatelier.net`,
    inicio: e.hora === null ? e.dia : `${e.dia}T${e.hora}`,
    minutos: e.minutos ?? 60,
    titulo: e.clase === 'evento' ? e.titulo : `${e.titulo} · ${NOMBRE_DE_CLASE[e.clase]}`,
    lugar: e.clase === 'pago' ? null : e.detalle,
    descripcion: e.clase === 'pago' ? e.detalle : null,
    url: `${base}${e.ruta}`,
    // El cronograma es la noche del evento: sin una alarma por cada momento.
    aviso: e.clase !== 'momento',
  })
  return respuestaIcs(calendarioIcs(evento.value.title, entradas.map(aCalendario), new Date()), 'agenda.ics')
}

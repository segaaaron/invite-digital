import { asistente, events, plans } from '@/app/composition/container'
import type { Actor } from '@/modules/identity'
import { gestionaElEvento } from '@/modules/identity'
import type { Allowance } from '@/modules/plans'
import { isErr } from '@/shared/result'
import { nombreDePlan } from './nombre-de-plan'
import { mejorarPara } from './mejorar'
import { tieneLuxury } from '@/modules/asistente'

/**
 * Luxury bloqueado: lo que ve quien **podría** usarlo pero su evento no lo tiene, para que sepa que existe
 * y cómo conseguirlo (`mejorarPara`: el anfitrión, a Extras; el atelier, al plan). `null` si no toca.
 */
export async function luxuryParaMejorar(actor: Actor, slug: string) {
  if (!asistente.disponible || actor.role === 'admin' || actor.role === 'puerta' || actor.soporte !== undefined) return null
  const evento = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(evento)) return null
  const [capacidad, config] = await Promise.all([plans.allowanceFor(evento.value.id), asistente.config()])
  if (isErr(capacidad) || tieneLuxury(capacidad.value, config)) return null
  const [mejorar, planes, extras] = await Promise.all([mejorarPara(actor, slug, 'Ver extras'), Promise.all(config.planes.map(nombreDePlan)), plans.listActiveExtras()])
  const comoExtra = extras.some((x) => x.effect === 'asistente')
  // El anfitrión mejora comprando extras: sin Luxury a la venta como extra, Extras no le sirve (se lo pide al atelier).
  const destino = mejorar?.href.endsWith('/extras') === true && !comoExtra ? null : mejorar
  return { mejorar: destino, planes, comoExtra }
}

/**
 * Quién puede hablar con Luxury en un evento, **en un solo sitio**: la carcasa lo usa para pintar el
 * botón y la ruta para responder (el botón es cortesía; el corte es la ruta).
 *
 * Hace falta modelo (clave de OpenAI), abrir la sección del anfitrión (dueño, anfitrión, planner), no ser
 * admin ni recepción ni estar en modo soporte (decidido el 28 de septiembre), y que el plan del evento
 * esté entre los que lo traen (Admin › Asistente).
 */
export async function accesoAlAsistente(actor: Actor, slug: string) {
  if (!asistente.disponible || actor.role === 'admin' || actor.role === 'puerta' || actor.soporte !== undefined) return null
  const evento = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(evento)) return null
  const [capacidad, config] = await Promise.all([plans.allowanceFor(evento.value.id), asistente.config()])
  if (isErr(capacidad) || !tieneLuxury(capacidad.value, config)) return null
  const rol = gestionaElEvento(actor, evento.value)
    ? 'organizador (el atelier que lleva el evento)'
    : (await events.staff.membershipsOf(evento.value.id, actor.userId)).includes('planner')
      ? 'planner contratado'
      : 'anfitrión (quien celebra)'
  return { evento: evento.value, capacidad: capacidad.value as Allowance, config, rol, nombreDelPlan: await nombreDePlan(capacidad.value.planSlug) }
}

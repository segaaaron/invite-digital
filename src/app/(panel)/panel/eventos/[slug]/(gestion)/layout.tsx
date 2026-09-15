import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { checkin, events, guestbook, guests, plans } from '@/app/composition/container'
import { gestionaElEvento, isAdmin, rolEnEquipo, sectionForRole } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import { panelNav } from '@/modules/shell/ui/nav'
import { PanelFrame } from '@/modules/shell/ui/PanelFrame'
import { SupportBanner } from '@/modules/admin/ui/SupportBanner'
import { hasFeature } from '@/modules/plans'
import { insigniasDeAdmin } from '../../../_carcasa/insignias-de-admin'
import { isErr } from '@/shared/result'

/**
 * La carcasa de todas las páginas de un evento. Vive aquí y no en cada página porque una
 * página puede olvidarla —lo hicieron ocho— y entonces el panel cambia de forma al pasar
 * de sección.
 *
 * Fuera del grupo `(gestion)` quedan a propósito el modo puerta, que tiene su propio
 * diseño a pantalla completa, y el plan del banquete, que es papel para imprimir.
 */
export default async function EventoLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ slug: string }>
}) {
  const actor = await requireSession()
  const { slug } = await params

  // La carcasa envuelve al check-in, al panel del cliente y al del atelier, así que pide
  // **la sección del rol de quien entra**: con una fija, dos de los tres se quedarían
  // fuera antes de llegar a su propia pantalla. El corte de cada sección lo hace cada
  // página, no este layout.
  //
  // Un atelier que no es dueño puede ser la planner de ese evento: entra por su pertenencia.
  const primero = await events.getFor(actor, slug, { section: sectionForRole(actor.role) })
  const event = isErr(primero) && actor.role === 'atelier' ? await events.getFor(actor, slug, { section: 'cliente' }) : primero
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  // Las insignias de la barra, en paralelo: eran once lecturas en fila. Si una falla, la barra
  // se pinta sin ella: un contador no es motivo para tumbar la página que lo rodea.
  const id = event.value.id
  const dueno = gestionaElEvento(actor, event.value)
  const [grupos, libro, capacidad, insignias, equipo, mesaPlanner] = await Promise.all([
    guests.contar(id).catch(() => null),
    guestbook.sinLeer(id).catch(() => null),
    plans.allowanceFor(id),
    insigniasDeAdmin(actor),
    // Quien entra por pertenencia ve la barra de su papel en el equipo.
    dueno || actor.role === 'puerta' ? null : events.staff.membershipsOf(id, actor.userId).then(rolEnEquipo),
    actor.role === 'puerta' ? false : events.staff.eventIdsOf(actor.userId, ['planner']).then((ids) => ids.length > 0),
  ])
  // La capacidad ya leída dice si trae puerta: `requireFeature` la volvía a calcular entera.
  const puerta = !isErr(capacidad) && hasFeature(capacidad.value, 'checkin') ? await checkin.state(id) : null

  return (
    <PanelFrame
      brandSub={`EVENTO · ${event.value.slug.toUpperCase()}`}
      sections={panelNav(event.value.slug, {
        invitados: grupos,
        sinLeer: libro,
        llegadas: puerta === null || isErr(puerta) ? null : puerta.value.tally.arrivedGroups,
        pedidos: insignias.pedidos,
        consultas: insignias.consultas,
      }, isAdmin(actor), actor.role === 'puerta', actor.role === 'cliente' || equipo !== null, { equipo, mesaPlanner })}
      user={{
        title: event.value.title,
        planLabel: isErr(capacidad) ? 'PLAN —' : `PLAN ${capacidad.value.planSlug.toUpperCase()}`,
      }}
    >
      {actor.soporte === undefined ? null : <SupportBanner clienteEmail={actor.email} />}
      {children}
    </PanelFrame>
  )
}

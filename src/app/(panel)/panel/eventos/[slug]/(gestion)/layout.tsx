import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { checkin, events, guestbook, guests, orders, plans } from '@/app/composition/container'
import { unreadCount } from '@/modules/guestbook'
import { requireSession } from '@/modules/identity/session-cookie'
import { panelNav } from '@/modules/shell/ui/nav'
import { PanelFrame } from '@/modules/shell/ui/PanelFrame'
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
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  // Las insignias de la barra. Si una falla, la barra se pinta sin ella: un contador no
  // es motivo para tumbar la página que lo rodea.
  const grupos = await guests.list(event.value.id)
  const libro = await guestbook.list(event.value.id)
  const capacidad = await plans.allowanceFor(event.value.id)

  const conPuerta = await plans.requireFeature(event.value.id, 'checkin')
  const puerta = isErr(conPuerta) ? null : await checkin.state(event.value.id)

  // La insignia cuenta lo que espera decisión. Un pedido con comprobante y sin mirar es
  // alguien que transfirió y no ha recibido nada.
  const pedidos = await orders.list()
  const porRevisar = isErr(pedidos) ? null : pedidos.value.filter((p) => p.order.status === 'proof_submitted').length

  return (
    <PanelFrame
      brandSub={`EVENTO · ${event.value.slug.toUpperCase()}`}
      sections={panelNav(event.value.slug, {
        invitados: isErr(grupos) ? null : grupos.value.length,
        sinLeer: isErr(libro) ? null : unreadCount(libro.value),
        llegadas: puerta === null || isErr(puerta) ? null : puerta.value.tally.arrivedGroups,
        pedidos: porRevisar,
      })}
      user={{
        title: event.value.title,
        planLabel: isErr(capacidad) ? 'PLAN —' : `PLAN ${capacidad.value.planSlug.toUpperCase()}`,
      }}
    >
      {children}
    </PanelFrame>
  )
}

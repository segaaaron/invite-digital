import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { checkin, events, guestbook, plans } from '@/app/composition/container'
import { unreadCount } from '@/modules/guestbook'
import { requireSession } from '@/modules/identity/session-cookie'
import { eventNav } from '@/modules/shell/ui/nav'
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
  const libro = await guestbook.list(event.value.id)
  const sinLeer = isErr(libro) ? null : unreadCount(libro.value)

  const conPuerta = await plans.requireFeature(event.value.id, 'checkin')
  const puerta = isErr(conPuerta) ? null : await checkin.state(event.value.id)
  const llegadas = puerta === null || isErr(puerta) ? null : puerta.value.tally.arrivedGroups

  return (
    <PanelFrame brandSub={`EVENTO · ${event.value.slug.toUpperCase()}`} sections={eventNav(event.value.slug, { sinLeer, llegadas })}>
      {children}
    </PanelFrame>
  )
}

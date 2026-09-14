import { notFound } from 'next/navigation'
import { events, guestbook } from '@/app/composition/container'
import { unreadCount } from '@/modules/guestbook'
import { InboxFilters } from '@/modules/guestbook/ui/InboxFilters'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Mensajes' }

// Los invitados escriben mientras el atelier mira la bandeja: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function MensajesPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const libro = await guestbook.list(event.value.id)
  if (isErr(libro)) throw new Error(libro.error.detail)

  const sinLeer = unreadCount(libro.value)

  return (
    <>
      <PanelHeader
        kicker="Libro de firmas"
        meta={`${libro.value.length} mensaje${libro.value.length === 1 ? '' : 's'} en tu libro de firmas · ${sinLeer} sin leer`}
        title="Mensajes"
      />

      {/* Sin tarjeta que lo envuelva: la maqueta pinta los mensajes sueltos sobre el
          marfil, y cada firma ya es su propia tarjeta. */}
      <InboxFilters eventId={event.value.id} eventSlug={event.value.slug} messages={libro.value} />
    </>
  )
}

import { notFound } from 'next/navigation'
import { events, guestbook } from '@/app/composition/container'
import { InboxFilters } from '@/modules/guestbook/ui/InboxFilters'
import { requireSession } from '@/modules/identity/session-cookie'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Mensajes' }

// Los invitados escriben mientras el atelier mira la bandeja: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function MensajesPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const libro = await guestbook.list(event.value.id)
  if (isErr(libro)) throw new Error(libro.error.detail)

  return (
    <>
      <PanelHeader
        kicker="Libro de firmas"
        meta="Lo que los invitados escribieron al confirmar. Lo que destaques aquí es lo que verá la pareja en su enlace de solo lectura."
        title="Mensajes"
      />

      <PanelCard>
        <InboxFilters eventId={event.value.id} eventSlug={event.value.slug} messages={libro.value} />
      </PanelCard>
    </>
  )
}

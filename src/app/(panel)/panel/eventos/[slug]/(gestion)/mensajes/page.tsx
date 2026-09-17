import { notFound } from 'next/navigation'
import { events, guestbook } from '@/app/composition/container'
import { LibroDeFirmas } from '@/modules/guestbook/ui/LibroDeFirmas'
import { requireSession } from '@/app/_acciones/sesion'
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

  return (
    <>
      <PanelHeader
        kicker="Libro de firmas"
        meta={libro.value.length === 0 ? 'Las palabras que te dejan tus invitados al confirmar' : `${libro.value.length} ${libro.value.length === 1 ? 'firma' : 'firmas'} de tus invitados`}
        title="Mensajes"
      />

      <LibroDeFirmas eventId={event.value.id} eventSlug={event.value.slug} messages={libro.value} />
    </>
  )
}

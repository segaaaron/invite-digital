import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, guestbook } from '@/app/composition/container'
import { InboxFilters } from '@/modules/guestbook/ui/InboxFilters'
import { requireSession } from '@/modules/identity/session-cookie'
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
    <div className="mx-auto flex max-w-[860px] flex-col gap-8 p-10">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <h1 className="font-display text-[26px] font-light text-ink">Mensajes · {event.value.title}</h1>
        <Link
          className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute"
          href={`/panel/eventos/${event.value.slug}`}
        >
          Volver al evento
        </Link>
      </header>

      <p className="text-[13px] leading-[1.7] text-ink-soft">
        Lo que los invitados escribieron al confirmar. Lo que destaques aquí es lo que verá la pareja en su enlace de
        solo lectura.
      </p>

      <InboxFilters eventId={event.value.id} eventSlug={event.value.slug} messages={libro.value} />
    </div>
  )
}

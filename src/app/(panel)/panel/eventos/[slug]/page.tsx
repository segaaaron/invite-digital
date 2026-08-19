import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, guests } from '@/app/composition/container'
import { EventForm } from '@/modules/events/ui/EventForm'
import { GuestGroupForm } from '@/modules/guests/ui/GuestGroupForm'
import { GuestGroupTable, type GuestGroupRowView } from '@/modules/guests/ui/GuestGroupTable'
import { requireSession } from '@/modules/identity/session-cookie'
import { isErr } from '@/shared/result'

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const groups = await guests.list(event.value.id)
  const filas: GuestGroupRowView[] = isErr(groups)
    ? []
    : groups.value.map((group) => ({ ...group, confirmed: null }))

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-10 p-10">
      <header className="flex items-center justify-between gap-6">
        <h1 className="font-display text-[26px] font-light text-ink">{event.value.title}</h1>
        <Link className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" href="/panel">
          Volver
        </Link>
      </header>

      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Invitados</h2>
        <GuestGroupForm eventId={event.value.id} eventSlug={event.value.slug} />
        {isErr(groups) ? (
          <p className="text-[13px] text-gold-deep" role="alert">
            No pudimos leer los invitados. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <GuestGroupTable eventSlug={event.value.slug} groups={filas} />
        )}
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Datos del evento</h2>
        <EventForm event={event.value} />
      </section>
    </div>
  )
}

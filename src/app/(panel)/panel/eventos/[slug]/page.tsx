import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, guests, rsvp } from '@/app/composition/container'
import { ClientSharePanel } from '@/modules/events/ui/ClientSharePanel'
import { EventForm } from '@/modules/events/ui/EventForm'
import { GuestGroupForm } from '@/modules/guests/ui/GuestGroupForm'
import { GuestGroupTable, type GuestGroupRowView } from '@/modules/guests/ui/GuestGroupTable'
import { requireSession } from '@/modules/identity/session-cookie'
import { TallyStrip } from '@/modules/rsvp/ui/TallyStrip'
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
  // La última respuesta de cada grupo, una consulta por grupo. Con listas de invitados
  // de decenas de filas no compensa una consulta agregada; si un evento crece a
  // centenares, `tallyRowsFor` ya trae la forma que haría falta.
  const filas: GuestGroupRowView[] = isErr(groups)
    ? []
    : await Promise.all(
        groups.value.map(async (group) => ({
          ...group,
          confirmed: (await rsvp.latestFor(group.id))?.attending ?? null,
        })),
      )

  const tally = await rsvp.tally(event.value.id)
  const share = await events.liveShare(event.value.id)

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-10 p-10">
      <header className="flex items-center justify-between gap-6">
        <h1 className="font-display text-[26px] font-light text-ink">{event.value.title}</h1>
        <div className="flex items-center gap-4">
          <Link
            className="rounded-full border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink"
            href={`/panel/eventos/${event.value.slug}/mesas`}
          >
            Mesas
          </Link>
          <Link
            className="rounded-full border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink"
            href={`/panel/eventos/${event.value.slug}/puerta`}
          >
            Modo puerta
          </Link>
          <Link className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute" href="/panel">
            Volver
          </Link>
        </div>
      </header>

      {isErr(tally) ? null : <TallyStrip tally={tally.value} />}

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
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Enlace para el cliente</h2>
        <ClientSharePanel
          eventId={event.value.id}
          eventSlug={event.value.slug}
          live={
            isErr(share) || share.value === null
              ? null
              : { id: share.value.id, expiresAt: share.value.expiresAt.toISOString().slice(0, 10) }
          }
        />
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Datos del evento</h2>
        <EventForm event={event.value} />
      </section>
    </div>
  )
}

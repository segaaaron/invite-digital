import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, rsvp } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { EventStats } from '@/modules/rsvp/ui/EventStats'
import { isErr } from '@/shared/result'

// Los números cambian con cada respuesta: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function EventStatsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const stats = await rsvp.stats(event.value.id)

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-10 p-10">
      <header className="flex items-center justify-between gap-6">
        <h1 className="font-display text-[26px] font-light text-ink">Estadísticas · {event.value.title}</h1>
        <Link
          className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute"
          href={`/panel/eventos/${event.value.slug}`}
        >
          Volver
        </Link>
      </header>

      {isErr(stats) ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          No pudimos leer las estadísticas. La base no responde; vuelve a intentarlo en un momento.
        </p>
      ) : (
        <EventStats stats={stats.value} />
      )}
    </div>
  )
}

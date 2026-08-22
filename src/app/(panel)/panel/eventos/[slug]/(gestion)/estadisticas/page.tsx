import { notFound } from 'next/navigation'
import { events, rsvp } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { EventStats } from '@/modules/rsvp/ui/EventStats'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
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
    <>
      <PanelHeader kicker="Analítica" meta={event.value.title} title="Estadísticas" />

      <PanelCard>
        {isErr(stats) ? (
          <p className="text-[13px] text-gold-deep" role="alert">
            No pudimos leer las estadísticas. La base no responde; vuelve a intentarlo en un momento.
          </p>
        ) : (
          <EventStats stats={stats.value} />
        )}
      </PanelCard>
    </>
  )
}

import { notFound } from 'next/navigation'
import { events, rsvp } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { EventStats } from '@/modules/rsvp/ui/EventStats'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { DonutChart, PanelCard } from '@/modules/shell/ui/cards'
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

      {isErr(stats) ? (
        <PanelCard>
          <p className="text-[13px] text-gold-deep" role="alert">
            No pudimos leer las estadísticas. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      ) : (
        <div className="grid gap-4.5 lg:grid-cols-[1fr_1.2fr]">
          <PanelCard title="Estado de RSVPs">
            {stats.value.empty ? (
              <p className="text-[13px] text-ink-mute">Todavía no hay invitados en este evento.</p>
            ) : (
              <DonutChart
                big={`${stats.value.attendingPercent ?? 0}%`}
                caption="CONFIRMADOS"
                slices={[
                  { label: 'Asisten', value: stats.value.groupsAttending, color: 'var(--color-sage)' },
                  { label: 'No asisten', value: stats.value.groupsDeclined, color: 'var(--color-danger)' },
                  { label: 'Sin responder', value: stats.value.groupsPending, color: 'var(--color-gold-light)' },
                ]}
              />
            )}
          </PanelCard>

          <PanelCard title="Embudo de conversión">
            <EventStats stats={stats.value} />
          </PanelCard>
        </div>
      )}
    </>
  )
}

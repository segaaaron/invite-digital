import { notFound } from 'next/navigation'
import { analytics, events, rsvp } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import type { Breakdown } from '@/modules/analytics'
import { EventStats } from '@/modules/rsvp/ui/EventStats'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { DonutChart, PanelCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

// Los números cambian con cada respuesta: esta página no se cachea.
export const dynamic = 'force-dynamic'

/**
 * Un desglose de visitas. Con cero visitas lo dice con palabras: una lista de ceros con
 * sus porcentajes se lee como «nadie usa esto», y es distinto de «nadie ha mirado
 * todavía».
 */
function Desglose({ filas, total }: { filas: readonly Breakdown[] | null; total: number }) {
  if (filas === null) {
    return (
      <p className="text-[13px] text-gold-deep" role="alert">
        No pudimos leer las visitas. La base no responde; vuelve a intentarlo en un momento.
      </p>
    )
  }

  if (total === 0) {
    return <p className="text-[13px] text-ink-mute">Todavía nadie ha abierto la invitación.</p>
  }

  return (
    <ul className="flex flex-col gap-4">
      {filas.map((fila) => (
        <li key={fila.label} className="flex flex-col gap-2">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-ink">{fila.label}</span>
            <span className="font-mono text-[12px] text-ink-soft">
              {fila.count} · {fila.percent} %
            </span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-bg-sunken">
            <span
              aria-hidden
              className="block h-full rounded-full bg-sage transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${fila.percent}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  )
}

export default async function EventStatsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const stats = await rsvp.stats(event.value.id)
  const visitas = await analytics.tally(event.value.id)
  const vistas = isErr(visitas) ? null : visitas.value

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

      <div className="mt-4.5 grid gap-4.5 lg:grid-cols-2">
        <PanelCard title="Dispositivos">
          <Desglose filas={vistas?.devices ?? null} total={vistas?.total ?? 0} />
        </PanelCard>
        <PanelCard title="Fuentes de tráfico">
          <Desglose filas={vistas?.sources ?? null} total={vistas?.total ?? 0} />
        </PanelCard>
      </div>
    </>
  )
}

import { notFound } from 'next/navigation'
import { analytics, events, rsvp } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import type { Breakdown } from '@/modules/analytics'
import { EventStats } from '@/modules/rsvp/ui/EventStats'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { DonutChart, PanelCard } from '@/modules/shell/ui/cards'
import { BarRow } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

// Los números cambian con cada respuesta: esta página no se cachea.
export const dynamic = 'force-dynamic'

/**
 * Un desglose de visitas. Con cero visitas lo dice con palabras: una lista de ceros con
 * sus porcentajes se lee como «nadie usa esto», y es distinto de «nadie ha mirado
 * todavía».
 */
function Desglose({
  filas,
  total,
  tone,
}: {
  filas: readonly Breakdown[] | null
  total: number
  tone: 'device' | 'gold'
}) {
  if (filas === null) {
    return (
      <p className="text-[13px] text-danger" role="alert">
        No pudimos leer las visitas. La base no responde; vuelve a intentarlo en un momento.
      </p>
    )
  }

  if (total === 0) {
    return <p className="text-[13px] text-ink-mute">Todavía nadie ha abierto la invitación.</p>
  }

  // Etiqueta, carril y cifra en la misma línea, como la maqueta: apilar la barra debajo
  // del rótulo doblaba el alto de la tarjeta y rompía la simetría de la rejilla.
  return (
    <ul className="flex flex-col">
      {filas.map((fila) => (
        <li key={fila.label}>
          <BarRow label={fila.label} ratio={fila.percent / 100} tone={tone} value={`${fila.percent} %`} />
        </li>
      ))}
    </ul>
  )
}

export default async function EventStatsPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

  const event = await events.getFor(actor, slug, { section: 'cliente' })
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
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer las estadísticas. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      ) : (
        <div className="grid items-start gap-4.5 min-[900px]:grid-cols-2">
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

      <div className="mt-4.5 grid items-start gap-4.5 min-[900px]:grid-cols-2">
        <PanelCard title="Dispositivos">
          <Desglose filas={vistas?.devices ?? null} tone="device" total={vistas?.total ?? 0} />
        </PanelCard>
        <PanelCard title="Fuentes de tráfico">
          <Desglose filas={vistas?.sources ?? null} tone="gold" total={vistas?.total ?? 0} />
        </PanelCard>
      </div>
    </>
  )
}

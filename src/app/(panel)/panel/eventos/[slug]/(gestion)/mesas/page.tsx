import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, plans, venue } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { FloorPlan } from '@/modules/venue/ui/FloorPlan'
import { SeatingToolbar } from '@/modules/venue/ui/SeatingToolbar'
import { TableCard } from '@/modules/venue/ui/TableCard'
import { UnseatedStrip } from '@/modules/venue/ui/UnseatedStrip'
import { ZoneControls } from '@/modules/venue/ui/ZoneControls'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Mesas' }

// La ocupación cambia con cada RSVP y con cada reparto: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function MesasPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  // La misma puerta que corta las acciones, aquí solo para no enseñar un salón que el
  // plan no permite tocar. Lo que protege es la del servidor, no esta.
  const permitido = await plans.requireFeature(event.value.id, 'seating')
  if (isErr(permitido)) {
    return <FeatureLocked eventSlug={event.value.slug} reason={permitido.error.detail} title="Mesas" />
  }

  const seating = await venue.seating(event.value.id)
  if (isErr(seating)) throw new Error(seating.error.detail)

  const { tables, zones, unseated, totalSeats, totalConfirmed } = seating.value

  return (
    <>
      <PanelHeader
        actions={
          <Link
            className="rounded-full border border-line px-4 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase"
            href={`/panel/eventos/${event.value.slug}/mesas/imprimir`}
          >
            Imprimir plan ↓
          </Link>
        }
        kicker="Distribución"
        meta={event.value.title}
        title="Mesas"
      />

      <div className="flex flex-col gap-4.5">
        <PanelCard title="Reparto">
          <SeatingToolbar
            eventId={event.value.id}
            eventSlug={event.value.slug}
            tables={tables}
            unseated={unseated}
            totalSeats={totalSeats}
            totalConfirmed={totalConfirmed}
          />
        </PanelCard>

        <PanelCard title="Invitados sin mesa">
          <UnseatedStrip groups={unseated} />
        </PanelCard>

        <PanelCard title="Plano del salón">
          <div className="flex flex-col gap-4.5">
            <FloorPlan
              eventId={event.value.id}
              eventSlug={event.value.slug}
              tables={tables}
              zones={zones}
              exits={[{ href: `/panel/eventos/${event.value.slug}`, label: 'Volver al evento' }]}
            />
            <ZoneControls eventId={event.value.id} eventSlug={event.value.slug} zones={zones} />
          </div>
        </PanelCard>

        <PanelCard title="Mesas del salón">
          {tables.length === 0 ? (
            <p className="text-[13px] text-ink-mute">
              Todavía no hay mesas. Crea la primera arriba y empieza a repartir a los invitados.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tables.map((table) => (
                <TableCard
                  key={table.id}
                  eventId={event.value.id}
                  eventSlug={event.value.slug}
                  table={table}
                  unseated={unseated}
                />
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </>
  )
}

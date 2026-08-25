import { notFound } from 'next/navigation'
import { events, guests, plans, venue } from '@/app/composition/container'
import { dietaryReport } from '@/modules/guests'
import { requireSession } from '@/modules/identity/session-cookie'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { BarRow } from '@/shared/design/ui/panel/PanelKit'
import { FloorPlan } from '@/modules/venue/ui/FloorPlan'
import { SeatingActions } from '@/modules/venue/ui/SeatingActions'
import { SeatSearch } from '@/modules/venue/ui/SeatSearch'
import { TableDialog } from '@/modules/venue/ui/TableDialog'
import { SeatViewToggle } from '@/modules/venue/ui/SeatViewToggle'
import { TableCard } from '@/modules/venue/ui/TableCard'
import { UnseatedStrip } from '@/modules/venue/ui/UnseatedStrip'
import { ZoneControls } from '@/modules/venue/ui/ZoneControls'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Mesas' }

// La ocupación cambia con cada RSVP y con cada reparto: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function MesasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ panel?: string }>
}) {
  await requireSession()
  const { slug } = await params
  const { panel } = await searchParams

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

  // El reporte del catering sale de las personas cargadas. Sin personas no hay reporte,
  // y se dice: una tabla vacía se lee como «nadie tiene restricciones».
  const personas = await guests.listPeople(event.value.id)
  const menus = isErr(personas) ? [] : dietaryReport(personas.value)

  const seating = await venue.seating(event.value.id)
  if (isErr(seating)) throw new Error(seating.error.detail)

  const { tables, zones, unseated, totalSeats, totalConfirmed } = seating.value
  const asignados = tables.reduce((suma, mesa) => suma + mesa.taken, 0)
  const base = `/panel/eventos/${event.value.slug}/mesas`
  // El carril más largo es el del menú más pedido: las barras se comparan entre sí.
  const comensalesMaximos = menus.reduce((max, linea) => Math.max(max, linea.count), 0)

  return (
    <>
      <PanelHeader
        actions={
          <SeatingActions
            addHref={panel === 'mesa' ? base : `${base}?panel=mesa`}
            eventId={event.value.id}
            eventSlug={event.value.slug}
            unseatedCount={unseated.length}
          />
        }
        kicker="Distribución"
        meta={`${tables.length} mesas · capacidad ${totalSeats} · ${asignados}/${totalSeats} asignados`}
        title="Mesas"
      />

      {/* «+ Añadir mesa» abre el diálogo de la maqueta, no un panel desplegado. */}
      {panel === 'mesa' ? <TableDialog closeHref={base} eventId={event.value.id} eventSlug={event.value.slug} /> : null}

      {/* El buscador ancho va justo debajo de la cabecera, como en la maqueta. */}
      <div className="mb-4.5">
        <SeatSearch tables={tables} unseated={unseated} />
      </div>

      <div className="flex flex-col gap-4.5">
        <PanelCard title="Invitados sin mesa">
          <UnseatedStrip groups={unseated} />
        </PanelCard>

        <PanelCard title="Reporte de menús para el catering">
          {menus.length === 0 ? (
            <p className="text-[13px] text-ink-mute">
              Ninguna persona cargada tiene restricción alimentaria. Se cargan en la sección Invitados.
            </p>
          ) : (
            <>
              <p className="mb-3 text-[12px] text-ink-mute">
                {totalConfirmed} comensales confirmados · para compartir con el servicio de banquetes
              </p>
              <ul className="flex flex-col">
                {menus.map((linea) => (
                  <li key={linea.note}>
                    <BarRow
                      label={linea.note}
                      ratio={comensalesMaximos === 0 ? 0 : linea.count / comensalesMaximos}
                      value={String(linea.count)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </PanelCard>

        <SeatViewToggle
          cards={
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
          }
          map={
            <PanelCard title="Plano del salón">
              <div className="flex flex-col gap-4.5">
                <FloorPlan
                  eventId={event.value.id}
                  eventSlug={event.value.slug}
                  tables={tables}
                  zones={zones}
                  exits={[{ href: `/panel/eventos/${event.value.slug}`, label: 'Volver al evento' }]}
                />
                {/* La maqueta abre las zonas con «+ Elemento del salón»: desplegadas
                    dejaban tres formularios crudos colgando bajo el plano. */}
                <details>
                  <summary className="w-fit cursor-pointer list-none rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-ink uppercase transition-colors hover:border-ink">
                    + Elemento del salón
                  </summary>
                  <div className="mt-4.5">
                    <ZoneControls eventId={event.value.id} eventSlug={event.value.slug} zones={zones} />
                  </div>
                </details>
              </div>
            </PanelCard>
          }
        />
      </div>
    </>
  )
}

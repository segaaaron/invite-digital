import { notFound } from 'next/navigation'
import { events, guests, plans, venue } from '@/app/composition/container'
import { dietaryReport } from '@/modules/guests'
import { requireSession } from '@/modules/identity/session-cookie'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { BarRow, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { FloorPlan } from '@/modules/venue/ui/FloorPlan'
import { SeatingActions } from '@/modules/venue/ui/SeatingActions'
import { SeatSearch } from '@/modules/venue/ui/SeatSearch'
import { SeatingSearchProvider } from '@/modules/venue/ui/SeatingSearchContext'
import { TableDialog } from '@/modules/venue/ui/TableDialog'
import { ZoneDialog } from '@/modules/venue/ui/ZoneDialog'
import { SeatViewToggle } from '@/modules/venue/ui/SeatViewToggle'
import { TableCard } from '@/modules/venue/ui/TableCard'
import { UnseatedStrip } from '@/modules/venue/ui/UnseatedStrip'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Mesas' }

// La ocupación cambia con cada RSVP y con cada reparto: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function MesasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ panel?: string; vista?: string; zona?: string }>
}) {
  const actor = await requireSession()
  const { slug } = await params
  const { panel, vista, zona } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'cliente' })
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
  const enTarjetas = vista === 'tarjetas'

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

      {/* Las altas son los diálogos de la maqueta, no paneles desplegados en la página. */}
      {panel === 'mesa' ? <TableDialog closeHref={base} eventId={event.value.id} eventSlug={event.value.slug} /> : null}
      {panel === 'zona' ? (
        <ZoneDialog
          closeHref={base}
          eventId={event.value.id}
          eventSlug={event.value.slug}
          zone={zones.find((z) => z.id === zona)}
        />
      ) : null}

      {/* Buscador y conmutador en la misma fila, debajo de la cabecera: es la
          `seating-toolbar` de la maqueta. El proveedor comparte el término con el plano y
          con las tarjetas, que son las que se iluminan. */}
      <SeatingSearchProvider>
      <div className="mb-4.5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[280px] flex-1">
          <SeatSearch tables={tables} unseated={unseated} />
        </div>
        <SeatViewToggle base={base} current={enTarjetas ? 'tarjetas' : 'mapa'} />
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

        {/* Las tarjetas van sueltas sobre el marfil, como en la maqueta, y se ven **a la
            vez** que el plano: en el diseño el `hidden` de la rejilla lo anula su propio
            `display: grid`, así que lo que enseña es el plano arriba y las tarjetas
            debajo. El conmutador sirve para quedarse solo con las tarjetas. */}
        {enTarjetas ? null : (
          <PanelCard
            action={<PanelButton href={`${base}?panel=zona`}>+ Elemento del salón</PanelButton>}
            title="Plano del salón"
          >
            <FloorPlan
              eventId={event.value.id}
              eventSlug={event.value.slug}
              tables={tables}
              zones={zones}
              exits={[{ href: `/panel/eventos/${event.value.slug}`, label: 'Volver al evento' }]}
              zoneEditHrefPrefix={`${base}?panel=zona&zona=`}
            />
          </PanelCard>
        )}

        {tables.length === 0 ? (
          <PanelCard>
            <p className="text-[13px] text-ink-mute">
              Todavía no hay mesas. Créalas con «+ Añadir mesa» y empieza a repartir a los invitados.
            </p>
          </PanelCard>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
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
      </div>
      </SeatingSearchProvider>
    </>
  )
}

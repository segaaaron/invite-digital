import Link from 'next/link'
import { PlusIcon, TableIcon } from '@/shared/design/ui/icons'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { events, guests, plans, venue } from '@/app/composition/container'
import { dietaryReport } from '@/modules/guests'
import { requireSession } from '@/app/_acciones/sesion'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PlegableEnMovil } from '@/shared/design/ui/panel/PlegableEnMovil'
import { BarRow, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { FloorPlan, GuardarPlano } from '@/modules/venue/ui/FloorPlan'
import { SeatingActions } from '@/modules/venue/ui/SeatingActions'
import { SeatSearch } from '@/modules/venue/ui/SeatSearch'
import { SeatingSearchProvider } from '@/modules/venue/ui/SeatingSearchContext'
import { TableDialog } from '@/modules/venue/ui/TableDialog'
import { vocabularioDeCategoria } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
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
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason={permitido.error.detail} title="Mesas" />
  }

  // El reporte del catering sale de las personas cargadas. Sin personas no hay reporte,
  // y se dice: una tabla vacía se lee como «nadie tiene restricciones».
  const personas = await guests.listPeople(event.value.id)
  const menus = isErr(personas) ? [] : dietaryReport(personas.value)

  const seating = await venue.seating(event.value.id)
  if (isErr(seating)) throw new Error(seating.error.detail)

  const { tables, zones, unseated, totalConfirmed } = seating.value
  const asignados = tables.reduce((suma, mesa) => suma + mesa.taken, 0)
  const base = `/panel/eventos/${event.value.slug}/mesas`
  // El carril más largo es el del menú más pedido: las barras se comparan entre sí.
  const comensalesMaximos = menus.reduce((max, linea) => Math.max(max, linea.count), 0)
  const enTarjetas = vista === 'tarjetas'

  // La mesa principal se llama según la fiesta: en unos XV no hay novios.
  const vocabulario = vocabularioDeCategoria(themeFor(event.value.themeKey).categorySlug)

  return (
    <>
      <PanelHeader
        actions={
          // En el celular, con la lista (M33), estas acciones viven en ella; en el plano o las tarjetas, sí.
          <div className={vista === 'plano' || enTarjetas ? '' : 'max-[767px]:hidden'}>
          <SeatingActions
            addHref={panel === 'mesa' ? base : `${base}?panel=mesa`}
            eventId={event.value.id}
            eventSlug={event.value.slug}
            guardar={enTarjetas || (tables.length === 0 && zones.length === 0) ? undefined : <GuardarPlano />}
            unseatedCount={unseated.length}
          />
          </div>
        }
        meta={`${asignados} de ${asignados + unseated.reduce((n, g) => n + g.seats, 0)} personas que asisten ya tienen mesa.`}
        title="Mesas"
      />

      {/* Las altas son los diálogos de la maqueta, no paneles desplegados en la página. */}
      {panel === 'mesa' ? <TableDialog closeHref={base} eventId={event.value.id} eventSlug={event.value.slug} mesaPrincipal={vocabulario.mesaPrincipal} /> : null}
      {panel === 'zona' ? <ZoneDialog closeHref={base} eventId={event.value.id} eventSlug={event.value.slug} zone={zones.find((z) => z.id === zona)} /> : null}

      <SeatingSearchProvider>
        {/* Buscar a alguien, mapa o tarjetas, el plan para imprimir y los elementos del salón: una fila discreta. */}
        <div className={`mb-6 flex flex-wrap items-center gap-3 ${vista === 'plano' || enTarjetas ? '' : 'max-[767px]:hidden'}`}>
          <div className="min-w-[240px] flex-1">
            <SeatSearch tables={tables} unseated={unseated} />
          </div>
          <SeatViewToggle base={base} current={enTarjetas ? 'tarjetas' : 'mapa'} />
          <PanelButton href={`${base}?panel=zona`} size="sm">
            <PlusIcon className="size-4" /> Elemento del salón
          </PanelButton>
          <PanelButton href={`/panel/eventos/${event.value.slug}/mesas/imprimir`} size="sm">
            Imprimir plan
          </PanelButton>
        </div>

        <div className="flex flex-col gap-10">
          {tables.length === 0 && zones.length === 0 ? (
            <>
              <UnseatedStrip groups={unseated} />
              <EmptyState
                description="Crea las mesas con sus lugares y reparte a las familias. La puerta le dice a cada invitado dónde se sienta."
                icon={<TableIcon />}
                title="Aún no hay mesas en tu salón"
              />
            </>
          ) : enTarjetas ? (
            <>
              <UnseatedStrip groups={unseated} />
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {tables.map((table) => (
                  <TableCard eventId={event.value.id} eventSlug={event.value.slug} key={table.id} mesaPrincipal={vocabulario.mesaPrincipal} table={table} unseated={unseated} />
                ))}
              </div>
            </>
          ) : (
            <>
            {/* En el celular (maqueta M33): quién falta, las mesas en lista y el plano a un toque; se arma mejor en grande. */}
            {vista === 'plano' ? null : (
              <div className="flex flex-col gap-4 min-[768px]:hidden">
                {unseated.length === 0 ? null : (
                  <div className="flex items-center gap-3 rounded-[16px] border border-gold/45 bg-bg-raised p-4">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] font-medium">
                        {unseated.reduce((n, g) => n + g.seats, 0)} personas sin mesa
                      </span>
                      <span className="truncate text-[13px] text-ink-mute">
                        {unseated
                          .slice(0, 2)
                          .map((g) => g.label)
                          .join(', ')}
                        {unseated.length > 2 ? ` y ${unseated.length - 2} más` : ''}
                      </span>
                    </span>
                    <PanelButton href={`${base}?vista=tarjetas`} size="sm" variant="primary">
                      Sentarlas
                    </PanelButton>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <PanelButton href={`${base}?panel=mesa`}>
                    <PlusIcon className="size-4" /> Mesa
                  </PanelButton>
                  <PanelButton href={`${base}?vista=plano`}>Ver el plano</PanelButton>
                </div>
                <ul className="flex flex-col">
                  {tables.map((t, i) => (
                    <li className="border-b border-line-panel last:border-b-0" key={t.id}>
                      <Link className="flex min-h-15 items-center gap-3.5 py-3 text-ink no-underline" href={`${base}?vista=tarjetas`}>
                        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-panel-strong font-display text-[18px] [font-variant-numeric:lining-nums]">
                          {t.label.replace(/^mesa\s*/i, '').replace(/^0+(?=\d)/, '') || i + 1}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[15px] font-medium">{t.label}</span>
                          <span className="truncate text-[13px] text-ink-mute">{t.groups.length === 0 ? 'Vacía' : t.groups.map((g) => g.label).join(' y ')}</span>
                        </span>
                        <span className="shrink-0 text-[14px] text-gold-deep [font-variant-numeric:tabular-nums]">
                          {t.taken}/{t.capacity}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="text-[13px] text-ink-mute">El plano del salón se arma mejor en la computadora o la tablet. Aquí puedes sentar y mover a cada familia.</p>
              </div>
            )}
            <div className={vista === 'plano' ? '' : 'max-[767px]:hidden'}>
            <FloorPlan
              eventId={event.value.id}
              eventSlug={event.value.slug}
              exits={[{ href: `/panel/eventos/${event.value.slug}`, label: 'Volver al evento' }]}
              mesaPrincipal={vocabulario.mesaPrincipal}
              tables={tables}
              unseated={unseated}
              zoneEditHrefPrefix={`${base}?panel=zona&zona=`}
              zones={zones}
            />
            </div>
            </>
          )}

          <PlegableEnMovil resumen={menus.length === 0 ? 'Sin restricciones cargadas' : `${menus.length} ${menus.length === 1 ? 'menú especial' : 'menús especiales'}`} titulo="Menús para el catering">
            <section aria-labelledby="menus" className="flex flex-col gap-2">
              <h2 className="border-b border-line-panel pb-2.5 font-display text-[24px] font-medium" id="menus">
                Menús para el catering
              </h2>
              {menus.length === 0 ? (
                <p className="text-[14px] text-ink-mute">Ninguna persona cargada tiene restricción alimentaria. Se cargan en la sección Invitados.</p>
              ) : (
                <>
                  <p className="text-[13.5px] text-ink-mute">{totalConfirmed} comensales confirmados · para compartir con el servicio de banquetes</p>
                  <ul className="flex max-w-[640px] flex-col">
                    {menus.map((linea) => (
                      <li key={linea.note}>
                        <BarRow label={linea.note} ratio={comensalesMaximos === 0 ? 0 : linea.count / comensalesMaximos} value={String(linea.count)} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </PlegableEnMovil>
        </div>
      </SeatingSearchProvider>
    </>
  )
}

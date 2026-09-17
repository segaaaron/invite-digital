import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { events, planner, plans } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { momentosParaVer } from '@/modules/planner/ui/cronograma-vista'
import { NewMomentForm, RunOfShowBoard, SeedMomentsButton } from '@/modules/planner/ui/RunOfShowBoard'
import { FeatureLocked } from '@/modules/plans'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { FilterChipLink, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { iconosDelItinerario } from '@/modules/events/ui/themes/iconos-itinerario'

export const metadata = { title: 'Cronograma' }
export const dynamic = 'force-dynamic'

export default async function CronogramaPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ panel?: string; proveedor?: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const { panel, proveedor } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'planner' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'plannerCompleto'))) {
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason="El cronograma del día viene con Firma 3D y Alta Costura." title="Cronograma" />
  }

  const proveedores = (await planner.dia.listVendors(event.value.id)).map((p) => ({ id: p.id, service: p.service }))
  const todos = momentosParaVer(await planner.dia.listMoments(event.value.id))
  // La vista por proveedor: el DJ ve sus entradas de canción; el catering, sus tiempos.
  const momentos = proveedor ? todos.filter((m) => m.vendorIds.includes(proveedor)) : todos
  const evento = { eventId: event.value.id, eventSlug: event.value.slug }
  // Los iconos del diseño de su invitación, para los momentos que salen en ella.
  const iconos = iconosDelItinerario(themeFor(event.value.themeKey).key)
  const enInvitacion = todos.filter((m) => m.enInvitacion).length
  const base = `/panel/eventos/${event.value.slug}/planner/cronograma`
  const conAviso = todos.filter((m) => m.aviso !== null).length

  return (
    <>
      <PanelHeader
        actions={
          <>
            <PanelButton external href={`/panel/eventos/${event.value.slug}/cronograma/imprimir`}>
              Imprimir
            </PanelButton>
            <PanelButton href={`${base}?panel=momento`} variant="primary">
              Sumar momento
            </PanelButton>
          </>
        }
        kicker="Planner"
        meta={`${todos.length} momentos · ${enInvitacion} en la invitación${conAviso > 0 ? ` · ${conAviso} con aviso` : ''}`}
        title="Cronograma del día"
      />
      <div className="flex flex-col gap-4.5">
        {panel === 'momento' ? (
          <PanelCard title="Momento nuevo">
            <NewMomentForm evento={evento} iconos={iconos} proveedores={proveedores} />
          </PanelCard>
        ) : null}
        {todos.length === 0 ? (
          <PanelCard title="Tu cronograma">
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <p className="max-w-[52ch] text-[13px] leading-[1.7] text-ink-soft">
                Empieza con la plantilla de tu fiesta y ajusta las horas. Es la única lista de la noche: marca «Sale en la invitación» en los momentos que deben ver tus invitados.
              </p>
              <SeedMomentsButton evento={evento} />
            </div>
          </PanelCard>
        ) : (
          <PanelCard title={proveedor ? `Lo de ${proveedores.find((p) => p.id === proveedor)?.service ?? 'ese proveedor'}` : 'Momento a momento'}>
            {proveedores.length === 0 ? null : (
              <nav aria-label="Ver por proveedor" className="mb-4 flex flex-wrap gap-2">
                <FilterChipLink active={!proveedor} href={base}>
                  Todo
                </FilterChipLink>
                {proveedores.map((p) => (
                  <FilterChipLink active={proveedor === p.id} href={`${base}?proveedor=${p.id}`} key={p.id}>
                    {p.service}
                  </FilterChipLink>
                ))}
              </nav>
            )}
            <RunOfShowBoard evento={evento} iconos={iconos} momentos={momentos} proveedores={proveedores} />
          </PanelCard>
        )}
      </div>
    </>
  )
}

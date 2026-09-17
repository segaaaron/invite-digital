import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { events, planner, plans } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { momentosParaVer } from '@/modules/planner/ui/cronograma-vista'
import { CronogramaVacio, ItinerarioEnLaInvitacion, MomentoDialog, RunOfShowBoard } from '@/modules/planner/ui/RunOfShowBoard'
import { FeatureLocked } from '@/modules/plans'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { FilterChipLink, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { iconosDelItinerario } from '@/modules/events/ui/themes/iconos-itinerario'

export const metadata = { title: 'Cronograma' }
export const dynamic = 'force-dynamic'

export default async function CronogramaPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ momento?: string; proveedor?: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const { momento, proveedor } = await searchParams

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
  const tema = themeFor(event.value.themeKey)
  const iconos = iconosDelItinerario(tema.key)
  const base = `/panel/eventos/${event.value.slug}/planner/cronograma`
  const aqui = proveedor ? `${base}?proveedor=${proveedor}` : base
  const conMomento = (valor: string) => `${aqui}${proveedor ? '&' : '?'}momento=${valor}`
  const enInvitacion = todos.filter((m) => m.enInvitacion)
  const conAviso = todos.filter((m) => m.aviso !== null).length
  const editando = momento === undefined || momento === 'nuevo' ? undefined : todos.find((m) => m.id === momento)
  const ejemplo = (tema.defaultContent.itinerary ?? []).map((f) => ({ time: f.time, label: f.label, icono: f.imageId ?? null }))

  return (
    <>
      <PanelHeader
        actions={
          <>
            {todos.length === 0 ? null : (
              <PanelButton external href={`/panel/eventos/${event.value.slug}/cronograma/imprimir`}>
                Imprimir
              </PanelButton>
            )}
            <PanelButton href={conMomento('nuevo')} variant="primary">
              Sumar momento
            </PanelButton>
          </>
        }
        kicker="Planner"
        meta={todos.length === 0 ? 'La hora de cada momento del día, para tu equipo y tus invitados' : `${todos.length} momento${todos.length === 1 ? '' : 's'} · ${enInvitacion.length} en la invitación${conAviso > 0 ? ` · ${conAviso} con aviso` : ''}`}
        title="Cronograma del día"
      />
      {momento === 'nuevo' || editando ? (
        <MomentoDialog cerrarEn={aqui} evento={evento} iconos={iconos} key={momento} momento={editando} proveedores={proveedores} />
      ) : null}
      <div className="grid items-start gap-4.5 min-[1200px]:grid-cols-[minmax(0,1fr)_340px]">
        <PanelCard title={proveedor ? `Lo de ${proveedores.find((p) => p.id === proveedor)?.service ?? 'ese proveedor'}` : 'Momento a momento'}>
          {todos.length === 0 ? (
            <CronogramaVacio nuevo={conMomento('nuevo')} />
          ) : (
            <>
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
              <RunOfShowBoard editarEn={`${conMomento('')}`} iconos={iconos} momentos={momentos} proveedores={proveedores} />
            </>
          )}
        </PanelCard>
        <div className="min-[1200px]:sticky min-[1200px]:top-6">
          <PanelCard title="En tu invitación">
            <ItinerarioEnLaInvitacion
              ejemplo={ejemplo}
              filas={enInvitacion.map((m) => ({ time: m.startsAt, label: m.title, icono: m.icono }))}
              iconos={iconos}
              vistaPrevia={`/panel/eventos/${event.value.slug}/vista-previa`}
            />
          </PanelCard>
        </div>
      </div>
    </>
  )
}

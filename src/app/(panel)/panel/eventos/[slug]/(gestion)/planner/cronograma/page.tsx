import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { events, planner, plans } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { momentosParaVer } from '@/modules/planner/ui/cronograma-vista'
import { CronogramaVacio, ItinerarioEnLaInvitacion, MomentoDialog, RunOfShowBoard } from '@/modules/planner/ui/RunOfShowBoard'
import { FeatureLocked } from '@/modules/plans'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PlusIcon } from '@/shared/design/ui/icons'
import { FilterChipLink, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'
import { vocabularioDeCategoria } from '@/modules/events'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { iconosDelItinerario } from '@/modules/events/ui/themes/iconos-itinerario'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducirTodo } from '@/shared/i18n/en-ingles'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Cronograma', 'Schedule') }
}
export const dynamic = 'force-dynamic'

export default async function CronogramaPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ momento?: string; proveedor?: string }> }) {
  const t = await tr()
  const actor = await requireSession()
  const { slug } = await params
  const { momento, proveedor } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'planner' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'plannerCompleto'))) {
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason="El cronograma del día viene con Gala e Imperial." title={t('Cronograma', 'Schedule')} />
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
  const editando = momento === undefined || momento === 'nuevo' ? undefined : todos.find((m) => m.id === momento)
  const ejemplo = (tema.defaultContent.itinerary ?? []).map((f) => ({ time: f.time, label: f.label, icono: f.imageId ?? null }))

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href={conMomento('nuevo')} variant="primary">
            <PlusIcon className="size-4" /> {t('Añadir momento', 'Add moment')}
          </PanelButton>
        }
        meta={t('Los momentos del día en orden. Los que marques salen en el itinerario de tu invitación.', 'The moments of the day in order. The ones you check show in your invitation’s itinerary.')}
        title={t('Cronograma', 'Schedule')}
      />
      {momento === 'nuevo' || editando ? (
        <MomentoDialog cerrarEn={aqui} ejemplo={traducirTodo(vocabularioDeCategoria(tema.categorySlug).ejemplos.momento, t)} evento={evento} iconos={iconos} key={momento} momento={editando} proveedores={proveedores} />
      ) : null}
      {todos.length === 0 ? (
        <CronogramaVacio nuevo={conMomento('nuevo')} />
      ) : (
        <div className="grid items-start gap-x-8 gap-y-6 min-[1100px]:grid-cols-[minmax(0,1fr)_200px]">
          <div className="flex flex-col gap-4">
            {proveedores.length === 0 ? null : (
              <nav aria-label={t('Ver por proveedor', 'View by vendor')} className="flex flex-wrap gap-2.5 max-[767px]:-mx-4 max-[767px]:flex-nowrap max-[767px]:overflow-x-auto max-[767px]:px-4 max-[767px]:[scrollbar-width:none] max-[767px]:*:shrink-0">
                <FilterChipLink active={!proveedor} href={base}>
                  {t('Todo', 'All')}
                </FilterChipLink>
                {proveedores.map((p) => (
                  <FilterChipLink active={proveedor === p.id} href={`${base}?proveedor=${p.id}`} key={p.id}>
                    {p.service}
                  </FilterChipLink>
                ))}
              </nav>
            )}
            {proveedor ? <h2 className="font-display text-[24px] font-medium">{t(`Lo de ${proveedores.find((p) => p.id === proveedor)?.service ?? 'ese proveedor'}`, `For ${proveedores.find((p) => p.id === proveedor)?.service ?? 'that vendor'}`)}</h2> : null}
            <RunOfShowBoard editarEn={`${conMomento('')}`} iconos={iconos} momentos={momentos} proveedores={proveedores} />
          </div>
          <aside className="flex flex-col gap-4 min-[1100px]:sticky min-[1100px]:top-6">
            <ItinerarioEnLaInvitacion
              ejemplo={ejemplo}
              filas={enInvitacion.map((m) => ({ time: m.startsAt, label: m.title, icono: m.icono }))}
              vistaPrevia={`/panel/eventos/${event.value.slug}/vista-previa`}
            />
            <a className="inline-flex min-h-11 items-center justify-center text-[13.5px] text-gold-deep" href={`/panel/eventos/${event.value.slug}/cronograma/imprimir`} rel="noopener" target="_blank">
              {t('Imprimir el cronograma', 'Print the schedule')}
            </a>
          </aside>
        </div>
      )}
    </>
  )
}

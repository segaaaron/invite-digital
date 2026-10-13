import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { events, planner, plans } from '@/app/composition/container'
import { fiestaDeTema, VOCABULARIO } from '@/modules/events'
import { requireSession } from '@/app/_acciones/sesion'
import { buildWhatsAppLink } from '@/modules/leads'
import { TIPOS_DE_CORTEJO } from '@/modules/planner'
import { CourtBoard, EditarMiembro, NewCourtMemberForm, NuevoEnsayoForm, ProximoEnsayo } from '@/modules/planner/ui/CourtBoard'
import { FeatureLocked } from '@/modules/plans'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { PlusIcon } from '@/shared/design/ui/icons'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Cortejo' }
export const dynamic = 'force-dynamic'

export default async function CortejoPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ panel?: string; miembro?: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const { panel, miembro } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'plannerCompleto'))) {
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason="El cortejo y los ensayos vienen con Gala e Imperial." title="Cortejo" />
  }

  const fiesta = fiestaDeTema(event.value.themeKey)
  const tipos = TIPOS_DE_CORTEJO[fiesta]
  // Un cumpleaños no tiene cortejo: sin papeles que elegir, el formulario ofrecería un
  // desplegable vacío. La barra tampoco enseña el enlace.
  if (tipos.length === 0) notFound()
  const partidas = (await planner.listBudget(event.value.id)).map((p) => ({ id: p.id, concept: p.concept }))
  const miembros = (await planner.dia.listCourt(event.value.id)).map((m) => ({
    ...m,
    whatsappHref: m.whatsapp ? buildWhatsAppLink(m.whatsapp, `Hola ${m.name}, te escribo por ${event.value.title}.`) : null,
    partida: m.budgetItemId === null ? null : (partidas.find((p) => p.id === m.budgetItemId)?.concept ?? null),
  }))
  // El próximo primero; los que ya pasaron, al final.
  const ahora = new Date().getTime()
  const ensayos = (await planner.dia.listRehearsals(event.value.id))
    .toSorted((x, y) => (x.date.getTime() < ahora ? 1 : 0) - (y.date.getTime() < ahora ? 1 : 0) || x.date.getTime() - y.date.getTime())
    .map((x) => ({ ...x, cuando: mayuscula(DIA_Y_HORA.format(x.date).replace(',', '').replace(/ (\d+:\d+)$/, ', $1')) }))
  const evento = { eventId: event.value.id, eventSlug: event.value.slug }

  const base = `/panel/eventos/${event.value.slug}/planner/cortejo`
  const enEdicion = miembro === undefined ? undefined : miembros.find((m) => m.id === miembro)
  const proximo = ensayos[0]
  const avisar =
    proximo === undefined
      ? null
      : `https://wa.me/?text=${encodeURIComponent(`Ensayo de ${event.value.title}: ${proximo.cuando}${proximo.place ? `, en ${proximo.place}` : ''}. ¡Los esperamos!`)}`

  return (
    <>
      <PanelHeader
        actions={
          <span className="flex gap-2.5">
            <PanelButton href={`${base}?panel=ensayo`}>
              <PlusIcon className="size-4" /> Ensayo
            </PanelButton>
            <PanelButton href={`${base}?panel=miembro`} variant="primary">
              <PlusIcon className="size-4" /> Añadir persona
            </PanelButton>
          </span>
        }
        meta={fiesta === 'xv' ? 'Chambelanes, damas y corte, con sus ensayos.' : 'Padrinos, damas y pajes, con sus ensayos.'}
        title={fiesta === 'xv' ? 'Chambelanes y corte' : 'Cortejo'}
      />
      {panel === 'miembro' ? (
        <PanelDialog closeHref={base} title="Añadir al cortejo" width={620}>
          <NewCourtMemberForm ejemplo={VOCABULARIO[fiesta].ejemplos.apadrina} evento={evento} partidas={partidas} tipos={tipos} />
        </PanelDialog>
      ) : null}
      {panel === 'ensayo' ? (
        <PanelDialog closeHref={base} title={fiesta === 'xv' ? 'Ensayo del vals' : 'Ensayo'} width={620}>
          <NuevoEnsayoForm evento={evento} miembros={miembros} />
        </PanelDialog>
      ) : null}
      {enEdicion === undefined ? null : (
        <PanelDialog closeHref={base} title={enEdicion.name} width={620}>
          <EditarMiembro evento={evento} miembro={enEdicion} partidas={partidas} tipos={tipos} />
        </PanelDialog>
      )}
      <div className="grid items-start gap-x-8 gap-y-8 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
        <CourtBoard editarEn={`${base}?miembro=`} miembros={miembros} />
        {ensayos.length === 0 ? null : (
          <div className="max-[1099px]:-order-1 min-[1100px]:sticky min-[1100px]:top-6">
            <ProximoEnsayo avisar={avisar} ensayos={ensayos} evento={evento} miembros={miembros} />
          </div>
        )}
      </div>
    </>
  )
}

const DIA_Y_HORA = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' })
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

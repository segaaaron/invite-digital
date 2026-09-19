import { notFound } from 'next/navigation'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { events, planner, plans } from '@/app/composition/container'
import { fiestaDeTema } from '@/modules/events'
import { requireSession } from '@/app/_acciones/sesion'
import { buildWhatsAppLink } from '@/modules/leads'
import { TIPOS_DE_CORTEJO } from '@/modules/planner'
import { CourtBoard, NewCourtMemberForm, RehearsalsBoard } from '@/modules/planner/ui/CourtBoard'
import { FeatureLocked } from '@/modules/plans'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { fechaHora } from '@/shared/format/fecha'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Cortejo' }
export const dynamic = 'force-dynamic'

export default async function CortejoPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ panel?: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const { panel } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'plannerCompleto'))) {
    return <FeatureLocked eventSlug={event.value.slug} mejorar={await mejorarPara(actor, event.value.slug)} reason="El cortejo y los ensayos vienen con Firma 3D y Alta Costura." title="Cortejo" />
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
  const ensayos = (await planner.dia.listRehearsals(event.value.id)).map((x) => ({ ...x, cuando: fechaHora(x.date) }))
  const evento = { eventId: event.value.id, eventSlug: event.value.slug }

  return (
    <>
      <PanelHeader
        actions={
          <PanelButton href={`/panel/eventos/${event.value.slug}/planner/cortejo?panel=miembro`} variant="primary">
            Sumar al cortejo
          </PanelButton>
        }
        kicker="Planner"
        meta={`${miembros.length} en el cortejo · ${miembros.filter((m) => m.confirmed).length} confirmados`}
        title={fiesta === 'xv' ? 'Chambelanes y corte' : 'Cortejo y padrinos'}
      />
      <div className="flex flex-col gap-4.5">
        {panel === 'miembro' ? (
          <PanelCard title="Nuevo en el cortejo">
            <NewCourtMemberForm evento={evento} partidas={partidas} tipos={tipos} />
          </PanelCard>
        ) : null}
        <CourtBoard evento={evento} miembros={miembros} partidas={partidas} tipos={tipos} />
        <PanelCard title={fiesta === 'xv' ? 'Ensayos del vals' : 'Ensayos'}>
          <RehearsalsBoard ensayos={ensayos} evento={evento} miembros={miembros} />
        </PanelCard>
      </div>
    </>
  )
}

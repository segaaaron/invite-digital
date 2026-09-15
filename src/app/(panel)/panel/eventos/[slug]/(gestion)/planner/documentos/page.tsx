import { notFound } from 'next/navigation'
import { events, planner, plans } from '@/app/composition/container'
import { requireSession } from '@/app/_acciones/sesion'
import { DocumentsBoard } from '@/modules/planner/ui/DocumentsBoard'
import { FeatureLocked } from '@/modules/plans'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Documentos' }
export const dynamic = 'force-dynamic'

const peso = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

export default async function DocumentosPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }
  if (isErr(await plans.requireFeature(event.value.id, 'plannerCompleto'))) {
    return <FeatureLocked eventSlug={event.value.slug} reason="Los documentos y las referencias vienen con Firma 3D y Alta Costura." title="Documentos" />
  }

  const proveedores = (await planner.dia.listVendors(event.value.id)).map((v) => ({ id: v.id, nombre: v.company ? `${v.service} · ${v.company}` : v.service }))
  const partidas = (await planner.listBudget(event.value.id)).map((p) => ({ id: p.id, nombre: p.concept }))
  const documentos = (await planner.dia.listDocuments(event.value.id)).map((d) => ({
    id: d.id,
    kind: d.kind,
    topic: d.topic,
    originalName: d.originalName,
    peso: peso(d.byteSize),
    enlazado: proveedores.find((p) => p.id === d.vendorId)?.nombre ?? partidas.find((p) => p.id === d.budgetItemId)?.nombre ?? null,
    href: `/panel/eventos/${event.value.slug}/documentos/${d.id}`,
  }))

  return (
    <>
      <PanelHeader kicker="Planner" meta={`${documentos.length} documento${documentos.length === 1 ? '' : 's'} · privados, solo para tu equipo`} title="Documentos e inspiración" />
      <PanelCard title="Contratos, cotizaciones, facturas y referencias">
        <DocumentsBoard documentos={documentos} evento={{ eventId: event.value.id, eventSlug: event.value.slug }} partidas={partidas} proveedores={proveedores} />
      </PanelCard>
    </>
  )
}

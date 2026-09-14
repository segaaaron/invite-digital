import { notFound } from 'next/navigation'
import { events, plans, porters } from '@/app/composition/container'
import { PortersCard } from '@/modules/checkin/ui/PortersCard'
import { requireSession } from '@/modules/identity/session-cookie'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { fecha, hora } from '@/shared/format/fecha'
import { formatoWhatsapp } from '@/shared/whatsapp'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Porteros' }
export const dynamic = 'force-dynamic'

/**
 * Los porteros del evento. La abre quien compró —sección `cliente`—, su atelier y el admin;
 * el personal de puerta con cuenta no, y su barra ni la enseña.
 */
export default async function PorterosPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const permitido = await plans.requireFeature(event.value.id, 'checkin')
  if (isErr(permitido)) {
    return <FeatureLocked eventSlug={event.value.slug} reason="Tu plan no incluye pases con QR ni porteros." title="Porteros" />
  }

  const [capacidad, lista, actividad] = await Promise.all([
    plans.allowanceFor(event.value.id),
    porters.list(event.value.id),
    porters.activity(event.value.id),
  ])
  if (isErr(capacidad)) throw new Error(capacidad.error.detail)

  return (
    <>
      <PanelHeader kicker="Día del evento" meta="Quién registra la entrada de tus invitados" title="Porteros" />
      <PanelCard>
        <PortersCard
          eventId={event.value.id}
          eventSlug={event.value.slug}
          limite={capacidad.value.maxDoorPorters}
          porteros={lista.map((p) => ({
            id: p.id,
            name: p.name,
            gate: p.gate,
            phone: p.phone === null ? null : formatoWhatsapp(p.phone),
            createdAt: fecha(p.createdAt),
            registradas: actividad[p.id]?.registradas ?? 0,
            ultima: actividad[p.id] === undefined ? null : hora(actividad[p.id]!.ultima),
          }))}
        />
      </PanelCard>
    </>
  )
}

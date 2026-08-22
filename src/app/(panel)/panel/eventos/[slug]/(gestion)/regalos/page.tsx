import { notFound } from 'next/navigation'
import { events, plans, registry } from '@/app/composition/container'
import { requireSession } from '@/modules/identity/session-cookie'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { DEFAULT_CURRENCY } from '@/modules/registry'
import { FundCard } from '@/modules/registry/ui/FundCard'
import { FundForm } from '@/modules/registry/ui/FundForm'
import { GiftForm } from '@/modules/registry/ui/GiftForm'
import { GiftList } from '@/modules/registry/ui/GiftList'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard, StatCard } from '@/modules/shell/ui/cards'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Regalos' }

// Los invitados reservan mientras el atelier mira la lista: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function RegalosPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params

  const event = await events.getBySlug(slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const permitido = await plans.requireFeature(event.value.id, 'registry')
  if (isErr(permitido)) {
    return <FeatureLocked eventSlug={event.value.slug} reason={permitido.error.detail} title="Regalos" />
  }

  const mesa = await registry.list(event.value.id)
  if (isErr(mesa)) throw new Error(mesa.error.detail)

  const { gifts, funds, tally } = mesa.value

  return (
    <>
      <PanelHeader kicker="Mesa de regalos" meta={event.value.title} title="Regalos" />

      <div aria-label="Resumen de la mesa" className="mb-5.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard icon="❖" label="En la lista" value={tally.total} />
        <StatCard icon="○" label="Sin reservar" value={tally.available} />
        <StatCard icon="◐" label="Reservados" value={tally.reserved} />
        <StatCard icon="●" label="Comprados" value={tally.purchased} />
      </div>

      <div className="flex flex-col gap-4.5">
        <PanelCard title="Añadir un regalo">
          <GiftForm eventId={event.value.id} eventSlug={event.value.slug} />
        </PanelCard>

        <PanelCard title="Lista de regalos">
          <GiftList currency={DEFAULT_CURRENCY} eventId={event.value.id} eventSlug={event.value.slug} gifts={gifts} />
        </PanelCard>

        <PanelCard title="Fondos en efectivo">
          <div className="flex flex-col gap-4.5">
            <FundForm eventId={event.value.id} eventSlug={event.value.slug} />
            {funds.length === 0 ? (
              <p className="text-[13px] text-ink-mute">
                Todavía no hay fondos abiertos. Un fondo recauda por transferencia o en un sobre; lo que llega lo
                registras tú.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {funds.map((view) => (
                  <FundCard
                    key={view.fund.id}
                    currency={DEFAULT_CURRENCY}
                    eventId={event.value.id}
                    eventSlug={event.value.slug}
                    view={view}
                  />
                ))}
              </div>
            )}
          </div>
        </PanelCard>
      </div>
    </>
  )
}

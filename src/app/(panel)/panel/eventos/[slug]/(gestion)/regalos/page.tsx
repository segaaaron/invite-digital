import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events, plans, registry } from '@/app/composition/container'
import { CurrencyPicker } from '@/modules/events/ui/CurrencyPicker'
import { requireSession } from '@/modules/identity/session-cookie'
import { FeatureLocked } from '@/modules/plans/ui/FeatureLocked'
import { formatAmount } from '@/modules/registry/domain/money'
import { FundCard } from '@/modules/registry/ui/FundCard'
import { FundForm } from '@/modules/registry/ui/FundForm'
import { GiftForm } from '@/modules/registry/ui/GiftForm'
import { GiftList } from '@/modules/registry/ui/GiftList'
import { RegistryTabs } from '@/modules/registry/ui/RegistryTabs'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard, PanelCardLink } from '@/modules/shell/ui/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Regalos' }

// Los invitados reservan mientras el atelier mira la lista: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function RegalosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ panel?: string; vista?: string }>
}) {
  await requireSession()
  const { slug } = await params
  const { panel, vista } = await searchParams

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

  // La cabecera de la maqueta cuenta el dinero, no las tarjetas: lo recaudado en fondos
  // y lo que ya se llevaron de la lista frente a lo que vale entera.
  const recaudado = funds.reduce((suma, fondo) => suma + fondo.progress.raisedCents, 0)
  const valorLista = gifts.reduce((suma, regalo) => suma + (regalo.priceCents ?? 0), 0)
  const yaTomado = gifts
    .filter((regalo) => regalo.status !== 'available')
    .reduce((suma, regalo) => suma + (regalo.priceCents ?? 0), 0)

  const base = `/panel/eventos/${event.value.slug}/regalos`
  const abierto = panel === 'fondo' || panel === 'regalo' ? panel : null

  return (
    <>
      <PanelHeader
        actions={
          <>
            <CurrencyPicker current={event.value.currency} eventId={event.value.id} eventSlug={event.value.slug} />
            <PanelButton href={abierto === 'fondo' ? base : `${base}?panel=fondo`}>+ Añadir fondo</PanelButton>
            <PanelButton href={abierto === 'regalo' ? base : `${base}?panel=regalo`} variant="primary">
              + Añadir regalo
            </PanelButton>
          </>
        }
        kicker="Mesa de regalos"
        meta={`${formatAmount(recaudado, event.value.currency)} recaudados en fondos · ${formatAmount(
          yaTomado,
          event.value.currency,
        )} de ${formatAmount(valorLista, event.value.currency)} en regalos físicos · ${tally.total} en la lista`}
        title="Regalos"
      />

      <div className="flex flex-col gap-4.5">
        {abierto === 'regalo' ? (
          <PanelCard
            action={
              <Link href={base}>
                <PanelCardLink>Cerrar ✕</PanelCardLink>
              </Link>
            }
            title="Añadir un regalo"
          >
            <GiftForm eventId={event.value.id} eventSlug={event.value.slug} />
          </PanelCard>
        ) : null}

        {abierto === 'fondo' ? (
          <PanelCard
            action={
              <Link href={base}>
                <PanelCardLink>Cerrar ✕</PanelCardLink>
              </Link>
            }
            title="Abrir un fondo en efectivo"
          >
            <FundForm eventId={event.value.id} eventSlug={event.value.slug} />
          </PanelCard>
        ) : null}

        <RegistryTabs
          base={base}
          // Con el alta de regalo abierta se enseña la lista: quien acaba de añadir uno
          // quiere verlo, y dejarlo en los fondos hacía creer que no se había guardado.
          current={vista === 'regalos' || abierto === 'regalo' ? 'regalos' : 'fondos'}
          funds={
            funds.length === 0 ? (
              <PanelCard>
                <p className="text-[13px] text-ink-mute">
                  Todavía no hay fondos abiertos. Un fondo recauda por transferencia o en un sobre; lo que llega lo
                  registras tú.
                </p>
              </PanelCard>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {funds.map((view) => (
                  <FundCard
                    key={view.fund.id}
                    currency={event.value.currency}
                    eventId={event.value.id}
                    eventSlug={event.value.slug}
                    view={view}
                  />
                ))}
              </div>
            )
          }
          gifts={
            <PanelCard title="Lista de regalos">
              <GiftList
                currency={event.value.currency}
                eventId={event.value.id}
                eventSlug={event.value.slug}
                gifts={gifts}
              />
            </PanelCard>
          }
        />
      </div>
    </>
  )
}

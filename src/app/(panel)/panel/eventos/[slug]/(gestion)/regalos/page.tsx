import { CardIcon } from '@/shared/design/ui/icons'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { notFound } from 'next/navigation'
import { events, plans, registry } from '@/app/composition/container'
import { vocabularioDeCategoria } from '@/modules/events'
import { CurrencyPicker } from '@/modules/events/ui/CurrencyPicker'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { requireSession } from '@/app/_acciones/sesion'
import { formatAmount } from '@/shared/money'
import { FundCard } from '@/modules/registry/ui/FundCard'
import { FundForm } from '@/modules/registry/ui/FundForm'
import { GiftForm } from '@/modules/registry/ui/GiftForm'
import { GiftList } from '@/modules/registry/ui/GiftList'
import { RegistryTabs } from '@/modules/registry/ui/RegistryTabs'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { PanelAlert, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { FormasDeRegalarForm } from '@/modules/registry/ui/FormasDeRegalarForm'
import { getDictionary } from '@/shared/i18n/dictionaries'
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
  const actor = await requireSession()
  const { slug } = await params
  const { panel, vista } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  // Sobres y transferencia van en todos los planes; la lista y los fondos, solo en los que traen
  // la mesa de regalos (y sus acciones lo cortan en el servidor).
  const conMesa = !isErr(await plans.requireFeature(event.value.id, 'registry'))
  const [mesa, formas] = await Promise.all([registry.list(event.value.id), registry.formas(event.value.id)])
  if (isErr(mesa)) throw new Error(mesa.error.detail)

  const { gifts, funds, tally } = mesa.value
  // Lo que el invitado ve hoy, dicho: sin nada, la invitación no enseña la sección y conviene saberlo.
  const muestra = [
    formas.sobres ? 'lluvia de sobres' : null,
    formas.transferencia ? 'transferencia' : null,
    gifts.length > 0 ? 'lista de regalos' : null,
    funds.length > 0 ? 'fondos' : null,
  ].filter((x) => x !== null)

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
          conMesa ? (
            <>
              <CurrencyPicker current={event.value.currency} eventId={event.value.id} eventSlug={event.value.slug} />
              <PanelButton href={abierto === 'fondo' ? base : `${base}?panel=fondo`}>+ Añadir fondo</PanelButton>
              <PanelButton href={abierto === 'regalo' ? base : `${base}?panel=regalo`} variant="primary">
                + Añadir regalo
              </PanelButton>
            </>
          ) : undefined
        }
        kicker="Regalos"
        meta={
          conMesa
            ? `${formatAmount(recaudado, event.value.currency)} recaudados en fondos · ${formatAmount(yaTomado, event.value.currency)} de ${formatAmount(
                valorLista,
                event.value.currency,
              )} en regalos físicos · ${tally.total} en la lista`
            : 'Cómo pueden regalarte tus invitados'
        }
        title="Regalos"
      />

      <div className="mb-4.5">
        {muestra.length === 0 ? (
          <PanelAlert tone="error">Tu invitación no muestra regalos todavía: enciende la lluvia de sobres o la transferencia aquí abajo.</PanelAlert>
        ) : (
          <PanelAlert tone="ok">Tu invitación muestra: {muestra.join(', ')}.</PanelAlert>
        )}
      </div>

      <PanelCard className="mb-4.5" title="Formas de regalar">
        <FormasDeRegalarForm eventId={event.value.id} eventSlug={event.value.slug} formas={formas} sobresPorDefecto={getDictionary(event.value.locale).registry.sobresDefault} />
      </PanelCard>

      {conMesa ? (
      <div className="flex flex-col gap-4.5">
        {/* Las altas son los modales de la maqueta (`#modal-gift`, `#modal-fund`), no
            paneles desplegados sobre la lista. */}
        {abierto === 'regalo' ? (
          <PanelDialog closeHref={base} title="Añadir regalo">
            <GiftForm doneHref={base} eventId={event.value.id} eventSlug={event.value.slug} />
          </PanelDialog>
        ) : null}

        {abierto === 'fondo' ? (
          <PanelDialog closeHref={base} title="Añadir fondo en efectivo">
            <FundForm doneHref={base} ejemplo={vocabularioDeCategoria(themeFor(event.value.themeKey).categorySlug).ejemplos} eventId={event.value.id} eventSlug={event.value.slug} />
          </PanelDialog>
        ) : null}

        <RegistryTabs
          base={base}
          // Con el alta de regalo abierta se enseña la lista: quien acaba de añadir uno
          // quiere verlo, y dejarlo en los fondos hacía creer que no se había guardado.
          current={vista === 'regalos' || abierto === 'regalo' ? 'regalos' : 'fondos'}
          funds={
            funds.length === 0 ? (
              <PanelCard>
                <EmptyState
                  compact
                  description="Un fondo junta aportes para algo grande —el viaje, la luna de miel— por transferencia o en sobre. Lo que llega lo anotas tú."
                  icon={<CardIcon />}
                  title="Sin fondos abiertos"
                />
              </PanelCard>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
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
      ) : null}
    </>
  )
}

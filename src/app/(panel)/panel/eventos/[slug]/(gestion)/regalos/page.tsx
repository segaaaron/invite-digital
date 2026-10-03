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
import { PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { FormasDeRegalarForm } from '@/modules/registry/ui/FormasDeRegalarForm'
import { hayFormas } from '@/modules/registry'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'

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

  // La lista y los fondos, solo en los planes que traen la mesa de regalos; sobres y transferencia,
  // en los que traen las formas de regalar (`0084`). Las acciones lo cortan en el servidor.
  const conMesa = !isErr(await plans.requireFeature(event.value.id, 'registry'))
  const [mesa, formas] = await Promise.all([registry.list(event.value.id), registry.formas(event.value.id)])
  if (isErr(mesa)) throw new Error(mesa.error.detail)
  // Quien ya las configuró las conserva aunque su plan ya no las traiga.
  const conFormas = !isErr(await plans.requireFeature(event.value.id, 'giftWays')) || hayFormas(formas)

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
  // Sin lista en el plan, la tarjeta dice cómo tenerla (el atelier, al plan; el anfitrión, a Extras).
  const mejorarAlgo = conMesa ? null : await mejorarPara(actor, event.value.slug)
  // La lista no se vende como extra: al anfitrión, Extras no se la da. Solo el cambio de plan.
  const mejorar = mejorarAlgo?.href.endsWith('/extras') === true ? null : mejorarAlgo
  const abierto = panel === 'fondo' || panel === 'regalo' ? panel : null
  const mejorarFormas = conFormas ? null : (mejorarAlgo ?? (await mejorarPara(actor, event.value.slug)))

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

      {/* Tres formas de regalar, cada una con su estado; se configura en su diálogo. */}
      <section aria-label="Formas de regalar" className="mb-4.5 grid gap-4 min-[900px]:grid-cols-3">
        <FormaCard
          accion={conFormas ? (formas.sobres ? 'Editar' : 'Encender') : (mejorarFormas?.label ?? null)}
          descripcion="El efectivo que te entregan en la fiesta, en su sobre."
          estado={!conFormas ? { tono: 'pending', texto: 'No incluida' } : formas.sobres ? { tono: 'ok', texto: 'Activa' } : { tono: 'pending', texto: 'Apagada' }}
          href={conFormas ? `${base}?panel=sobres` : (mejorarFormas?.href ?? base)}
          titulo="Lluvia de sobres"
        />
        <FormaCard
          accion={conFormas ? (formas.transferencia ? 'Editar' : 'Encender') : (mejorarFormas?.label ?? null)}
          descripcion="Te transfieren directo a tu cuenta o con el QR de tu banco."
          estado={!conFormas ? { tono: 'pending', texto: 'No incluida' } : formas.transferencia ? { tono: 'ok', texto: formas.tieneQr ? 'Activa · con QR' : 'Activa' } : { tono: 'pending', texto: 'Apagada' }}
          href={conFormas ? `${base}?panel=transferencia` : (mejorarFormas?.href ?? base)}
          titulo="Transferencia o QR"
        />
        <FormaCard
          accion={conMesa ? 'Ver la lista' : (mejorar?.label ?? null)}
          descripcion={conMesa ? 'Regalos que reservan de tu lista y fondos para algo grande.' : 'Regalos que tus invitados reservan de tu lista, y fondos para algo grande. No viene en tu plan.'}
          estado={conMesa ? { tono: gifts.length + funds.length > 0 ? 'ok' : 'pending', texto: `${gifts.length} ${gifts.length === 1 ? 'regalo' : 'regalos'} · ${funds.length} ${funds.length === 1 ? 'fondo' : 'fondos'}` } : { tono: 'pending', texto: 'No incluida' }}
          href={conMesa ? '#lista' : (mejorar?.href ?? base)}
          titulo="Lista de regalos"
        />
      </section>
      <p className="mb-4.5 text-[13px] text-ink-soft">
        {muestra.length === 0 ? 'Tu invitación no muestra regalos todavía: enciende la lluvia de sobres o la transferencia.' : `Tu invitación muestra: ${muestra.join(', ')}.`}
      </p>

      {conFormas && (panel === 'sobres' || panel === 'transferencia') ? (
        <PanelDialog closeHref={base} title={panel === 'sobres' ? 'Lluvia de sobres' : 'Transferencia o QR'}>
          <FormasDeRegalarForm cerrarEn={base} eventId={event.value.id} eventSlug={event.value.slug} formas={formas} seccion={panel} sobresPorDefecto={getDictionary(event.value.locale).registry.sobresDefault} />
        </PanelDialog>
      ) : null}

      {conMesa ? (
      <div className="flex scroll-mt-6 flex-col gap-4.5" id="lista">
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

function FormaCard({ titulo, descripcion, estado, accion, href }: { titulo: string; descripcion: string; estado: { tono: PillTone; texto: string }; accion: string | null; href: string }) {
  return (
    <article className="flex flex-col gap-3 rounded-[18px] border border-line-panel bg-white p-5 shadow-card">
      {/* El estado arriba del título: al lado, en tres columnas estrechas se salía de la tarjeta. */}
      <div className="flex flex-col items-start gap-2">
        <Pill tone={estado.tono}>{estado.texto}</Pill>
        <h2 className="font-display text-[22px] leading-tight font-light text-ink">{titulo}</h2>
      </div>
      <p className="flex-1 text-[13px] leading-relaxed text-ink-soft">{descripcion}</p>
      {accion === null ? null : (
        <PanelButton aria-label={`${accion}: ${titulo}`} href={href}>
          {accion}
        </PanelButton>
      )}
    </article>
  )
}

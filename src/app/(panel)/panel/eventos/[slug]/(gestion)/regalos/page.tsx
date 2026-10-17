import Link from 'next/link'
import { CardIcon, PlusIcon } from '@/shared/design/ui/icons'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { notFound } from 'next/navigation'
import { events, plans, registry } from '@/app/composition/container'
import { vocabularioDeCategoria } from '@/modules/events'
import { CurrencyPicker } from '@/modules/events/ui/CurrencyPicker'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { requireSession } from '@/app/_acciones/sesion'
import { FundCard } from '@/modules/registry/ui/FundCard'
import { hace } from '@/shared/format/fecha'
import { formatAmount } from '@/shared/money'
import { FundForm } from '@/modules/registry/ui/FundForm'
import { GiftForm } from '@/modules/registry/ui/GiftForm'
import { GiftList } from '@/modules/registry/ui/GiftList'
import { RegistryTabs } from '@/modules/registry/ui/RegistryTabs'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { AccionDeLaIsla } from '@/shared/design/ui/panel/AccionDeLaIsla'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { PanelButton, TARJETA_DESTACADA } from '@/shared/design/ui/panel/PanelKit'
import { FormasDeRegalarForm } from '@/modules/registry/ui/FormasDeRegalarForm'
import { hayFormas } from '@/modules/registry'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import { mejorarPara } from '@/app/(panel)/panel/_carcasa/mejorar'
import { tr } from '@/shared/i18n/idioma-servidor'
import { traducirTodo } from '@/shared/i18n/en-ingles'
import type { T } from '@/shared/i18n/t'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Regalos', 'Gifts') }
}

// Los invitados reservan mientras el atelier mira la lista: esta página no se cachea.
export const dynamic = 'force-dynamic'

export default async function RegalosPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ panel?: string; vista?: string }>
}) {
  const t = await tr()
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

  const { gifts, funds } = mesa.value
  // Lo que el invitado ve hoy, dicho: sin nada, la invitación no enseña la sección y conviene saberlo.
  const muestra = [
    formas.sobres ? 'lluvia de sobres' : null,
    formas.transferencia ? 'transferencia' : null,
    gifts.length > 0 ? 'lista de regalos' : null,
    funds.length > 0 ? 'fondos' : null,
  ].filter((x) => x !== null)

  const base = `/panel/eventos/${event.value.slug}/regalos`
  // Sin lista en el plan, la tarjeta dice cómo tenerla (el atelier, al plan; el anfitrión, a Extras).
  const mejorarAlgo = conMesa ? null : await mejorarPara(actor, event.value.slug)
  // La lista no se vende como extra: al anfitrión, Extras no se la da. Solo el cambio de plan.
  const mejorar = mejorarAlgo?.href.endsWith('/extras') === true ? null : mejorarAlgo
  const abierto = panel === 'fondo' || panel === 'regalo' ? panel : null
  // La pestaña de fondos (E58) va sin las formas de regalar y con su propio botón: «Nuevo fondo».
  const enFondos = vista === 'fondos' || abierto === 'fondo'
  const aportes = funds
    .flatMap((v) => v.contributions.map((c) => ({ ...c, fondo: v.fund.name })))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6)
  const mejorarFormas = conFormas ? null : (mejorarAlgo ?? (await mejorarPara(actor, event.value.slug)))

  return (
    <>
      <PanelHeader
        actions={
          conMesa && enFondos ? (
            <PanelButton href={`${base}?panel=fondo&vista=fondos`} variant="primary">
              <PlusIcon className="size-4" /> {t('Nuevo fondo', 'New fund')}
            </PanelButton>
          ) : conMesa ? (
            <>
              <PanelButton href={abierto === 'fondo' ? base : `${base}?panel=fondo&vista=fondos`}>
                <PlusIcon className="size-4" /> {t('Añadir fondo', 'Add fund')}
              </PanelButton>
              <PanelButton href={abierto === 'regalo' ? base : `${base}?panel=regalo`} variant="primary">
                <PlusIcon className="size-4" /> {t('Añadir regalo', 'Add gift')}
              </PanelButton>
            </>
          ) : undefined
        }
        accionesSoloEnEscritorio
        kicker={t('Regalos', 'Gifts')}
        meta={t('Cómo pueden regalarte tus invitados. Lo que enciendas aparece en tu invitación.', 'How your guests can give you gifts. Whatever you turn on shows on your invitation.')}
        menu={conMesa ? <CurrencyPicker current={event.value.currency} eventId={event.value.id} eventSlug={event.value.slug} /> : undefined}
        title={t('Regalos', 'Gifts')}
      />

      {conMesa ? (
        <AccionDeLaIsla>
          {/* Dice qué añade: «+ Añadir» a secas no decía si era un regalo o un fondo (16 oct). */}
          <Link className="flex min-h-11 items-center gap-1 rounded-full border border-line-panel-strong bg-bg-raised px-3.5 text-[14px] font-medium text-ink no-underline" href={enFondos ? `${base}?panel=fondo&vista=fondos` : `${base}?panel=regalo`}>
            <PlusIcon className="size-4.5" />
            {enFondos ? t('Fondo', 'Fund') : t('Regalo', 'Gift')}
          </Link>
        </AccionDeLaIsla>
      ) : null}
      {/* Las formas de regalar en su tarjeta destacada (maqueta E11): cada una con su interruptor, que abre sus datos. */}
      <section aria-labelledby="formas-de-regalar" className={`${TARJETA_DESTACADA} mb-8 flex flex-wrap gap-x-10 gap-y-5 p-6.5 max-[559px]:p-5 ${enFondos ? 'hidden' : ''}`}>
        <div className="min-w-0 flex-[1_1_240px] max-[767px]:sr-only">
          <h2 className="font-display text-[26px] leading-tight font-medium" id="formas-de-regalar">
            {t('Formas de regalar', 'Ways to give')}
          </h2>
          <p className="mt-1.5 text-[14px] text-ink-mute">
            {conFormas ? t('En todos los planes. Tus invitados ven solo lo que enciendas.', 'On every plan. Your guests only see what you turn on.') : t('Tu plan no las incluye.', 'Your plan doesn’t include them.')}{' '}
            {muestra.length === 0 ? t('Tu invitación no muestra regalos todavía.', 'Your invitation doesn’t show gifts yet.') : t(`Tu invitación muestra: ${muestra.join(', ')}.`, `Your invitation shows: ${muestra.join(', ')}.`)}
          </p>
        </div>
        <ul className="flex min-w-0 flex-[2_1_360px] flex-col">
          <Forma t={t}
            descripcion={t('Un aviso con la caja de sobres en la recepción.', 'A note about the envelope box at the reception.')}
            encendida={formas.sobres}
            href={conFormas ? `${base}?panel=sobres` : (mejorarFormas?.href ?? base)}
            incluida={conFormas}
            titulo={t('Lluvia de sobres', 'Envelope shower')}
          />
          <Forma t={t}
            descripcion={formas.transferencia ? t(`Con sus datos${formas.tieneQr ? ' y el QR de tu banco' : ''}.`, `With its details${formas.tieneQr ? ' and your bank’s QR' : ''}.`) : t('Te transfieren directo a tu cuenta o con el QR de tu banco.', 'They transfer straight to your account or with your bank’s QR.')}
            editar={formas.transferencia ? `${base}?panel=transferencia` : null}
            encendida={formas.transferencia}
            href={conFormas ? `${base}?panel=transferencia` : (mejorarFormas?.href ?? base)}
            incluida={conFormas}
            titulo={t('Transferencia', 'Bank transfer')}
          />
          {conMesa ? null : (
            <Forma t={t} descripcion={t('Regalos que reservan de tu lista, y fondos para algo grande. No viene en tu plan.', 'Gifts they reserve from your list, and funds for something big. Not included in your plan.')} encendida={false} href={mejorar?.href ?? base} incluida={false} titulo={t('Lista de regalos', 'Gift list')} />
          )}
        </ul>
      </section>

      {conFormas && (panel === 'sobres' || panel === 'transferencia') ? (
        <PanelDialog closeHref={base} title={panel === 'sobres' ? t('Lluvia de sobres', 'Envelope shower') : t('Transferencia o QR', 'Transfer or QR')}>
          <FormasDeRegalarForm cerrarEn={base} eventId={event.value.id} eventSlug={event.value.slug} formas={formas} seccion={panel} sobresPorDefecto={getDictionary(event.value.locale).registry.sobresDefault} />
        </PanelDialog>
      ) : null}

      {conMesa ? (
      <div className="flex scroll-mt-6 flex-col gap-4.5" id="lista">
        {/* Las altas son los modales de la maqueta (`#modal-gift`, `#modal-fund`), no
            paneles desplegados sobre la lista. */}
        {abierto === 'regalo' ? (
          <PanelDialog closeHref={base} kicker={t('Regalos', 'Gifts')} lado="derecha" title={t('Añadir regalo', 'Add gift')} width={520}>
            <GiftForm doneHref={base} eventId={event.value.id} eventSlug={event.value.slug} />
          </PanelDialog>
        ) : null}

        {abierto === 'fondo' ? (
          <PanelDialog closeHref={base} kicker={t('Regalos', 'Gifts')} lado="derecha" title={t('Añadir fondo en efectivo', 'Add cash fund')} width={520}>
            <FundForm doneHref={`${base}?vista=fondos`} ejemplo={traducirTodo(vocabularioDeCategoria(themeFor(event.value.themeKey).categorySlug).ejemplos, t)} eventId={event.value.id} eventSlug={event.value.slug} />
          </PanelDialog>
        ) : null}

        <RegistryTabs
          base={base}
          // Con el alta de regalo abierta se enseña la lista: quien acaba de añadir uno
          // quiere verlo, y dejarlo en los fondos hacía creer que no se había guardado.
          current={vista === 'fondos' || abierto === 'fondo' ? 'fondos' : 'regalos'}
          cuentas={{ regalos: gifts.length, fondos: funds.length }}
          funds={
            funds.length === 0 ? (
              <PanelCard>
                <EmptyState
                  compact
                  description={t('Un fondo junta aportes para algo grande —el viaje, la luna de miel— por transferencia o en sobre. Lo que llega lo anotas tú.', 'A fund collects contributions for something big —the trip, the honeymoon— by transfer or in an envelope. You record what comes in.')}
                  icon={<CardIcon />}
                  title={t('Sin fondos abiertos', 'No open funds')}
                />
              </PanelCard>
            ) : (
              <div className="flex flex-col gap-9">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start gap-5">
                  {funds.map((view) => (
                    <FundCard key={view.fund.id} currency={event.value.currency} eventId={event.value.id} eventSlug={event.value.slug} view={view} />
                  ))}
                </div>
                {aportes.length === 0 ? null : (
                  <section aria-labelledby="ultimos-aportes">
                    <h2 className="border-b border-line-panel pb-2.5 font-display text-[24px] font-medium" id="ultimos-aportes">
                      {t('Últimos aportes', 'Latest contributions')}
                    </h2>
                    <ul>
                      {aportes.map((a) => (
                        <li className="flex items-baseline gap-4 border-b border-line-panel py-3 text-[14.5px]" key={a.id}>
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-medium">{a.displayName}</span> <span className="text-ink-mute">a {a.fondo}</span>
                          </span>
                          <span className="font-display text-[19px] font-medium [font-variant-numeric:lining-nums]">{formatAmount(a.amountCents, event.value.currency).replace(/,00$/, '')}</span>
                          <span className="w-[90px] text-right text-[13px] text-ink-mute">{hace(a.createdAt, new Date())}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )
          }
          gifts={
            <>
              <GiftList currency={event.value.currency} eventId={event.value.id} eventSlug={event.value.slug} gifts={gifts} />
              {gifts.length === 0 ? null : <p className="text-[14px] text-ink-mute">{t('Tú ves quién reservó cada regalo. Tus invitados solo ven que ya está reservado.', 'You see who reserved each gift. Your guests only see that it is already reserved.')}</p>}
            </>
          }
        />
      </div>
      ) : null}
    </>
  )
}

/** Una forma de regalar en su fila (maqueta E11): qué es, si se editan sus datos y su interruptor. */
function Forma({ titulo, descripcion, encendida, incluida, href, editar = null, t }: { titulo: string; descripcion: string; encendida: boolean; incluida: boolean; href: string; editar?: string | null; t: T }) {
  return (
    <li className="flex items-center gap-4 border-b border-line-panel py-3 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{titulo}</span>
        <span className="block text-[13.5px] text-ink-mute">{descripcion}</span>
      </span>
      {editar === null ? null : (
        <Link className="shrink-0 text-[14px] text-gold-deep max-[559px]:hidden" href={editar}>
          {t('Editar datos', 'Edit details')}
        </Link>
      )}
      <Link
        aria-label={incluida ? t(`${titulo}: ${encendida ? 'encendida, cambiar' : 'apagada, encender'}`, `${titulo}: ${encendida ? 'on, change' : 'off, turn on'}`) : t(`${titulo}: no viene en tu plan`, `${titulo}: not included in your plan`)}
        className={`grid min-h-11 shrink-0 place-items-center ${incluida ? '' : 'opacity-50'}`}
        href={href}
      >
        {/* El interruptor mide 28 px; el toque, 44 (la fila entera de alto). */}
        <span aria-hidden className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${encendida ? 'bg-shell-deep' : 'bg-line-panel-strong'}`}>
          <span className={`absolute size-5.5 rounded-full bg-bg-raised shadow transition-transform ${encendida ? 'translate-x-[22px]' : 'translate-x-[3px]'}`} />
        </span>
      </Link>
    </li>
  )
}

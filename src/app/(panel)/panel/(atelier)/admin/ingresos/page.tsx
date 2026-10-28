import Link from 'next/link'
import { idiomaDeLaPeticion, tr } from '@/shared/i18n/idioma-servidor'
import { admin, cargarVentas } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { analizarVentas } from '@/modules/admin/domain/analisis'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { etiquetaDeMotivo } from '@/modules/leads/domain/pipeline'
import { formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { BarRow, PanelAlert, botonClases } from '@/shared/design/ui/panel/PanelKit'
import { EtiquetaDeFiesta, nombreDeFiesta } from '@/shared/design/ui/panel/lista'
import { fechaHora } from '@/shared/format/fecha'
import { plural } from '@/shared/format/plural'
import { isErr } from '@/shared/result'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { traducir } from '@/shared/i18n/en-ingles'
import type { Locale } from '@/shared/i18n/locales'
import { INTL } from '@/shared/i18n/t'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Ingresos · Administración', 'Revenue · Administration') }
}
export const dynamic = 'force-dynamic'

const formatoMes = (locale: Locale) => new Intl.DateTimeFormat(INTL[locale], { month: 'short', year: '2-digit', timeZone: 'UTC' })
const formatoMesLargo = (locale: Locale) => new Intl.DateTimeFormat(INTL[locale], { month: 'long', timeZone: 'UTC' })

/** Las vistas de la maqueta (E15): cómo mirar el dinero. */
const VISTAS = [
  { key: 'cobro', label: 'Por mes del cobro' },
  { key: 'evento', label: 'Por mes del evento' },
  { key: 'fiesta', label: 'Por fiesta' },
  { key: 'temporadas', label: 'Temporadas' },
] as const
const formatoMesCorto = (locale: Locale) => new Intl.DateTimeFormat(INTL[locale], { month: 'short', timeZone: 'UTC' })

/** Todo se vende en BOB hoy. Si un día hay dos monedas, sumarlas sería mentir: se separan. */
const bs = (cents: number) => formatAmount(cents, 'BOB')

/**
 * **Ingresos: lo cobrado y lo que viene**, junto a Ventas (su pestaña). Lo aprobado por mes, por
 * plan y **por fiesta**; lo que queda por cobrar —pagos esperando y saldos de anticipos—; el dinero
 * por mes del evento, que es como llega la temporada; en qué meses se compra cada fiesta; por qué se
 * pierde y de dónde llega quien compra. Y el CSV para la contadora.
 */
export default async function AdminIngresosPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const t = await tr()
  const locale = await idiomaDeLaPeticion()
  await requireAdmin()
  const { vista: pedida } = await searchParams
  const vista = VISTAS.find((v) => v.key === pedida)?.key ?? 'cobro'
  const ahora = new Date()
  const hoy = fechaEnBolivia(ahora)
  const [ingresos, ventas] = await Promise.all([admin.income(), cargarVentas(ahora)])

  if (isErr(ingresos) || isErr(ventas)) {
    return (
      <>
        <PanelHeader kicker={t('Ventas', 'Sales')} title={t('Ingresos', 'Revenue')} />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            {t('No pudimos leer los ingresos. La base no responde; vuelve a intentarlo en un momento.', 'We could not read the revenue. The database is not responding; try again in a moment.')}
          </p>
        </PanelCard>
      </>
    )
  }

  const i = ingresos.value
  const a = analizarVentas(ventas.value.ventas, hoy, etiquetaDeMotivo)
  const seis = i.porMes.slice(-6)
  const techoSeis = Math.max(1, ...seis.map((m) => m.total))
  const anterior = i.porMes.at(-2)
  const cambio = anterior === undefined || anterior.total === 0 ? null : Math.round(((i.esteMes - anterior.total) / anterior.total) * 100)
  const techoPlan = Math.max(1, ...i.porPlan.map((p) => p.total))
  const techoFiesta = Math.max(1, ...a.porFiesta.map((f) => f.total))
  const techoEvento = Math.max(1, ...a.porMesDelEvento.map((m) => m.cobrado + m.abierto))
  const techoOrigen = Math.max(1, ...a.origenes.map((o) => o.consultas))

  return (
    <>
      <PanelHeader
        actions={
          // Un `<a>` normal y no `next/link`: es una descarga de un route handler, no una página.
          <a className={botonClases()} download href="/dashboard/admin/revenue/csv">
            {t('Descargar CSV', 'Download CSV')}
          </a>
        }
        meta={t('Lo cobrado: pedidos aprobados tras ver el comprobante.', 'What was collected: orders approved after seeing the receipt.')}
        title={t('Ingresos', 'Revenue')}
      />

      {i.sinImporte > 0 ? (
        <div className="mb-4.5">
          <PanelAlert tone="error">{plural(i.sinImporte, t('pedido aprobado sin importe (sin plan) no suma aquí.', 'approved order without an amount (no plan) does not add up here.'), t('pedidos aprobados sin importe (sin plan) no suman aquí.', 'approved orders without an amount (no plan) do not add up here.'))}</PanelAlert>
        </div>
      ) : null}

      <nav aria-label={t('Cómo mirarlo', 'How to look at it')} className="mb-7 flex flex-wrap gap-2.5 max-[767px]:-mx-4 max-[767px]:mb-5 max-[767px]:flex-nowrap max-[767px]:overflow-x-auto max-[767px]:px-4 max-[767px]:[scrollbar-width:none] max-[767px]:*:shrink-0">
        {VISTAS.map((v) => (
          <Link
            aria-current={vista === v.key ? 'page' : undefined}
            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13.5px] font-medium no-underline max-[859px]:min-h-11 ${vista === v.key ? 'border-shell-deep bg-shell-deep text-shell-ink' : 'border-line-panel-strong bg-bg-raised text-ink hover:border-gold'}`}
            href={v.key === 'cobro' ? '/dashboard/admin/revenue' : `/dashboard/admin/revenue?vista=${v.key}`}
            key={v.key}
          >
            {traducir(v.label, t)}
          </Link>
        ))}
      </nav>

      {/* Las cifras en su tira con filetes (maqueta E15). */}
      <dl className="mb-9 flex flex-wrap gap-y-4 max-[767px]:grid max-[767px]:grid-cols-2 max-[767px]:gap-x-4 max-[767px]:gap-y-5">
        {[
          { k: formatoMesLargo(locale).format(new Date(`${hoy}T00:00:00Z`)), v: bs(i.esteMes), d: cambio === null ? t('Aprobado en el mes en curso', 'Approved this month') : t(`${Math.abs(cambio)} % ${cambio >= 0 ? 'más' : 'menos'} que ${formatoMesLargo(locale).format(new Date(`${anterior!.mes}-01T00:00:00Z`))}`, `${Math.abs(cambio)} % ${cambio >= 0 ? 'more' : 'less'} than ${formatoMesLargo(locale).format(new Date(`${anterior!.mes}-01T00:00:00Z`))}`), ok: cambio !== null && cambio >= 0 },
          { k: t('En el año', 'This year'), v: bs(i.esteAnio), d: t('Desde el 1 de enero', 'Since January 1'), ok: false },
          { k: t('Ticket medio', 'Average ticket'), v: i.ticketMedio === null ? '—' : bs(i.ticketMedio), d: plural(i.aprobados, t('pedido aprobado', 'approved order'), t('pedidos aprobados', 'approved orders')), ok: false },
          { k: t('Por cobrar', 'To collect'), v: bs(a.porCobrar.total), d: a.porCobrar.saldos > 0 ? t(`${bs(a.porCobrar.saldos)} en saldos`, `${bs(a.porCobrar.saldos)} in balances`) : t('Pagos esperando o por revisar', 'Payments pending or to review'), ok: false },
        ].map((c, n) => (
          // En el celular, el mes va en su tarjeta destacada y las demás de dos en dos (maqueta M28).
          <div className={`flex-[1_1_180px] ${n === 0 ? 'max-[767px]:col-span-2 max-[767px]:rounded-[16px] max-[767px]:border max-[767px]:border-grab-borde max-[767px]:bg-bg-raised max-[767px]:p-5 max-[767px]:shadow-[inset_0_0_0_7px_var(--color-bg-raised),inset_0_0_0_8px_var(--color-grab-filete)]' : 'border-l border-line-panel pl-6 max-[767px]:border-l-0 max-[767px]:pl-0'}`} key={c.k}>
            <dt className="text-[13.5px] text-ink-mute first-letter:uppercase">{c.k}</dt>
            <dd className="m-0 font-display text-[32px] leading-[1.15] font-medium">{c.v.replace(/,00$/, '')}</dd>
            <dd className={`m-0 text-[13px] ${c.ok ? 'text-pill-ok-ink' : 'text-ink-mute'}`}>{c.d}</dd>
          </div>
        ))}
      </dl>

      {vista === 'cobro' ? (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="cobrado-por-mes" className="rounded-[16px] border border-line-panel bg-bg-raised p-6 max-[767px]:border-0 max-[767px]:bg-transparent max-[767px]:p-0">
            <h2 className="mb-6 font-display text-[24px] font-medium max-[767px]:sr-only" id="cobrado-por-mes">
              {t('Cobrado por mes, en Bs', 'Collected per month, in Bs')}
            </h2>
            {seis.every((m) => m.total === 0) ? (
              <EmptyState compact description={t('Cuando apruebes el primer pedido, aquí verás lo cobrado mes a mes.', 'When you approve the first order, you will see here what was collected month by month.')} title={t('Todavía no hay cobros', 'No payments yet')} />
            ) : (
              <ol aria-label={`${t('Cobrado por mes', 'Collected per month')}: ${seis.map((m) => `${formatoMesCorto(locale).format(new Date(`${m.mes}-01T00:00:00Z`))} ${bs(m.total)}`).join(', ')}`} className="flex h-[200px] items-end gap-[4%] px-2">
                {seis.map((m, n) => (
                  <li className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" key={m.mes}>
                    <span className="text-[12.5px] text-ink-mute [font-variant-numeric:tabular-nums]">{m.total === 0 ? '—' : bs(m.total).replace(/^Bs\s*/, '').replace(/,00$/, '')}</span>
                    <span className={`w-full max-w-[56px] rounded-t-[3px] ${n === seis.length - 1 ? 'bg-shell-deep' : 'bg-barra-suave'}`} style={{ height: `${Math.max(2, (m.total / techoSeis) * 100)}%` }} />
                    <span className="text-[12.5px] text-ink-mute">{formatoMesCorto(locale).format(new Date(`${m.mes}-01T00:00:00Z`)).replace('.', '')}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="de-consulta-a-evento">
            <h2 className="mb-3.5 font-display text-[24px] font-medium" id="de-consulta-a-evento">
              {t('De consulta a evento, este año', 'From inquiry to event, this year')}
            </h2>
            <ol className="grid grid-cols-2 overflow-hidden rounded-[12px] min-[700px]:grid-cols-4">
              {i.embudo.pasos.map((paso, n) => (
                <li className={`px-5 py-4 ${['bg-pill-maybe text-shell-deep', 'bg-barra-suave text-shell-deep', 'bg-sage text-shell-ink', 'bg-shell-deep text-shell-ink'][n] ?? ''}`} key={paso.clave}>
                  <span className="block font-display text-[30px] leading-tight font-medium">{paso.total}</span>
                  <span className="text-[13.5px]">
                    {traducir(paso.titulo, t)}
                    {paso.desdeElAnterior === null ? '' : `, ${paso.desdeElAnterior} %`}
                  </span>
                </li>
              ))}
            </ol>
          </section>

      <PanelCard title={t('Últimos cobros', 'Latest payments')}>
        {i.ultimos.length === 0 ? (
          <EmptyState compact description={t('Cada pedido que apruebes aparece aquí con su importe.', 'Each order you approve appears here with its amount.')} title={t('Todavía no se ha aprobado ningún pedido', 'No order has been approved yet')} />
        ) : (
          <ul className="flex flex-col">
            {i.ultimos.map((p) => (
              <li className="border-t border-line-panel first:border-none" key={p.ref}>
                {/* En el celular: nombre e importe arriba; referencia, plan y fecha debajo. */}
                <Link className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 py-3 transition-colors hover:bg-bg-sunken/50 min-[700px]:grid-cols-[6rem_minmax(0,1fr)_auto_7rem]" href={`/dashboard/admin/sales?venta=p-${p.ref}`}>
                  <span className="order-3 font-codigo text-[12px] tracking-[0.15em] text-ink-mute min-[700px]:order-none">{p.ref}</span>
                  <span className="order-1 min-w-0 truncate text-[14px] text-ink min-[700px]:order-none">
                    {p.customerName}
                    <span className="ml-2 text-[12px] text-ink-mute">{p.planName ?? t('Sin plan', 'No plan')}</span>
                  </span>
                  <span className="order-4 text-right text-[12px] text-ink-mute min-[700px]:order-none min-[700px]:text-left">{p.decidedAt ? fechaHora(p.decidedAt, locale) : ''}</span>
                  <span className="order-2 text-right font-display text-[20px] text-ink [font-variant-numeric:lining-nums] min-[700px]:order-none">{bs(p.amountCents ?? 0)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
          <a className={`${botonClases()} w-full min-[768px]:hidden`} download href="/dashboard/admin/revenue/csv">
            {t('Descargar CSV', 'Download CSV')}
          </a>
        </div>
      ) : vista === 'evento' ? (
        <PanelCard title={t('Por mes del evento', 'By event month')}>
          <p className="-mt-2 mb-3 text-[12px] text-ink-mute">{t('Lo vendido para los eventos de los próximos seis meses; en oro, lo que aún espera su pago.', 'What was sold for events in the next six months; in gold, what still awaits payment.')}</p>
          <div className="flex flex-col">
            {a.porMesDelEvento.map((m) => (
              <div className="flex items-center gap-3 py-1.5" key={m.mes}>
                <span className="w-16 shrink-0 text-[12.5px] text-ink-soft">{formatoMes(locale).format(new Date(`${m.mes}-01T00:00:00Z`))}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-sage" style={{ width: `${(m.cobrado / techoEvento) * 100}%` }} />
                  <span className="absolute inset-y-0 rounded-full bg-gold/60" style={{ left: `${(m.cobrado / techoEvento) * 100}%`, width: `${(m.abierto / techoEvento) * 100}%` }} />
                </span>
                <span className="w-28 shrink-0 text-right font-mono text-[12px] text-ink [font-variant-numeric:lining-nums]">{m.cobrado + m.abierto === 0 ? '—' : bs(m.cobrado + m.abierto)}</span>
              </div>
            ))}
          </div>
        </PanelCard>
      ) : vista === 'fiesta' ? (
        <div className="grid gap-4.5 min-[900px]:grid-cols-2">
          <PanelCard title={t('Por fiesta', 'By party')}>
          {a.porFiesta.length === 0 ? (
            <EmptyState compact title={t('Todavía no hay ventas cobradas', 'No collected sales yet')} />
          ) : (
            <div className="flex flex-col">
              {a.porFiesta.map((f) => (
                <BarRow key={String(f.fiesta)} label={`${nombreDeFiesta(f.fiesta, t)} · ${f.ventas}`} ratio={f.total / techoFiesta} tone="gold" value={bs(f.total)} wide />
              ))}
            </div>
          )}
        </PanelCard>
          <PanelCard title={t('Por plan', 'By plan')}>
          {i.porPlan.length === 0 ? (
            <EmptyState compact title={t('Todavía no hay pedidos aprobados', 'No approved orders yet')} />
          ) : (
            <div className="flex flex-col">
              {i.porPlan.map((fila) => (
                <BarRow key={fila.plan} label={`${fila.plan} · ${fila.pedidos}`} ratio={fila.total / techoPlan} tone="gold" value={bs(fila.total)} wide />
              ))}
            </div>
          )}
        </PanelCard>
        </div>
      ) : (
        <div className="grid gap-4.5 min-[900px]:grid-cols-2">
          <PanelCard title={t('Temporadas', 'Seasons')}>
          {a.temporadas.length === 0 ? (
            <EmptyState compact description={t('Con tres ventas cobradas de una fiesta, aquí verás en qué meses del año se compra más.', 'With three collected sales of a party type, you will see here which months sell the most.')} title={t('Aún pocas ventas para verlo', 'Too few sales to see it yet')} />
          ) : (
            <ul className="flex flex-col gap-3">
              {a.temporadas.map((tp) => (
                <li className="flex items-start gap-3" key={tp.fiesta}>
                  <EtiquetaDeFiesta fiesta={tp.fiesta} />
                  <p className="text-[13.5px] leading-relaxed text-ink">
                    {t('Se compran sobre todo en', 'Mostly bought in')} <b className="font-medium">{tp.meses.map((m) => traducir(m, t)).join(t(' y ', ' and '))}</b>
                    <span className="text-ink-mute"> · {plural(tp.ventas, t('venta', 'sale'), t('ventas', 'sales'))}</span>
                    {tp.meses[0] === undefined ? null : (
                      <span className="block text-[12px] text-ink-mute">
                        {t(`Prepara promociones y mensajes un mes antes de ${tp.meses[0]}.`, `Prepare promotions and messages a month before ${traducir(tp.meses[0], t)}.`)}
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12px] text-ink-mute">{t(`Hoy es ${formatoMesLargo(locale).format(new Date(`${hoy}T00:00:00Z`))}.`, `It is now ${formatoMesLargo(locale).format(new Date(`${hoy}T00:00:00Z`))}.`)}</p>
        </PanelCard>
          <PanelCard title={t('De dónde llegan y por qué se pierden', 'Where they come from and why they are lost')}>
          {a.origenes.length === 0 && a.motivosDePerdida.length === 0 ? (
            <EmptyState compact title={t('Todavía no hay consultas', 'No inquiries yet')} />
          ) : (
            <div className="flex flex-col gap-5">
              {a.origenes.length === 0 ? null : (
                <div className="flex flex-col">
                  {a.origenes.map((o) => (
                    <BarRow key={o.origen} label={traducir(o.origen, t)} ratio={o.consultas / techoOrigen} value={`${o.ganadas}/${o.consultas}`} />
                  ))}
                  <p className="mt-1 text-[12px] text-ink-mute">{t('Compradas sobre consultas, por origen.', 'Bought out of inquiries, by source.')}</p>
                </div>
              )}
              {a.motivosDePerdida.length === 0 ? null : (
                <ul className="flex flex-col gap-1.5 border-t border-line-panel pt-4">
                  {a.motivosDePerdida.map((m) => (
                    <li className="flex justify-between text-[13px]" key={m.motivo}>
                      <span className="text-ink-soft">{traducir(m.motivo, t)}</span>
                      <span className="font-mono text-ink">{m.veces}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </PanelCard>
        </div>
      )}
    </>
  )
}

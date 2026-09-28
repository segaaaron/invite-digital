import Link from 'next/link'
import { admin, cargarVentas } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { analizarVentas } from '@/modules/admin/domain/analisis'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { etiquetaDeMotivo } from '@/modules/leads/domain/pipeline'
import { formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { BarRow, PanelAlert, botonClases } from '@/shared/design/ui/panel/PanelKit'
import { EtiquetaDeFiesta, TiraDeCifras, nombreDeFiesta } from '@/shared/design/ui/panel/lista'
import { fechaHora } from '@/shared/format/fecha'
import { plural } from '@/shared/format/plural'
import { isErr } from '@/shared/result'
import { EmbudoDeVentas } from '@/modules/admin'
import { EmptyState } from '@/shared/design/ui/panel/estados'

export const metadata = { title: 'Ingresos · Administración' }
export const dynamic = 'force-dynamic'

const MES = new Intl.DateTimeFormat('es-BO', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const MES_LARGO = new Intl.DateTimeFormat('es-BO', { month: 'long', timeZone: 'UTC' })

/** Todo se vende en BOB hoy. Si un día hay dos monedas, sumarlas sería mentir: se separan. */
const bs = (cents: number) => formatAmount(cents, 'BOB')

/**
 * **Ingresos: lo cobrado y lo que viene**, junto a Ventas (su pestaña). Lo aprobado por mes, por
 * plan y **por fiesta**; lo que queda por cobrar —pagos esperando y saldos de anticipos—; el dinero
 * por mes del evento, que es como llega la temporada; en qué meses se compra cada fiesta; por qué se
 * pierde y de dónde llega quien compra. Y el CSV para la contadora.
 */
export default async function AdminIngresosPage() {
  await requireAdmin()
  const ahora = new Date()
  const hoy = fechaEnBolivia(ahora)
  const [ingresos, ventas] = await Promise.all([admin.income(), cargarVentas(ahora)])

  if (isErr(ingresos) || isErr(ventas)) {
    return (
      <>
        <PanelHeader kicker="Ventas" title="Ingresos" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los ingresos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  const i = ingresos.value
  const a = analizarVentas(ventas.value.ventas, hoy, etiquetaDeMotivo)
  const techoMes = Math.max(1, ...i.porMes.map((m) => m.total))
  const techoPlan = Math.max(1, ...i.porPlan.map((p) => p.total))
  const techoFiesta = Math.max(1, ...a.porFiesta.map((f) => f.total))
  const techoEvento = Math.max(1, ...a.porMesDelEvento.map((m) => m.cobrado + m.abierto))
  const techoOrigen = Math.max(1, ...a.origenes.map((o) => o.consultas))

  return (
    <>
      <PanelHeader
        actions={
          // Un `<a>` normal y no `next/link`: es una descarga de un route handler, no una página.
          <a className={botonClases()} download href="/panel/admin/ingresos/csv">
            Descargar CSV
          </a>
        }
        kicker="Ventas"
        meta="Pedidos aprobados, con el precio que tenían al pedirse"
        title="Ingresos"
      />

      {i.sinImporte > 0 ? (
        <div className="mb-4.5">
          <PanelAlert tone="error">{plural(i.sinImporte, 'pedido aprobado sin importe (sin plan) no suma aquí.', 'pedidos aprobados sin importe (sin plan) no suman aquí.')}</PanelAlert>
        </div>
      ) : null}

      <TiraDeCifras
        cifras={[
          { label: 'Este mes', value: bs(i.esteMes), detail: 'Aprobado en el mes en curso' },
          { label: 'Este año', value: bs(i.esteAnio), detail: 'Desde el 1 de enero' },
          { label: 'Ticket medio', value: i.ticketMedio === null ? '—' : bs(i.ticketMedio), detail: plural(i.aprobados, 'pedido aprobado', 'pedidos aprobados') },
          {
            label: 'Por cobrar',
            value: bs(a.porCobrar.total),
            detail: a.porCobrar.saldos > 0 ? `${bs(a.porCobrar.saldos)} en saldos` : 'Pagos esperando o por revisar',
            href: '/panel/admin/ventas?vista=lista&etapa=esperando_pago',
          },
        ]}
      />

      <PanelCard title="El recorrido de la venta">
        <EmbudoDeVentas embudo={i.embudo} />
      </PanelCard>

      <div className="mt-4.5 grid gap-4.5 min-[900px]:grid-cols-2">
        <PanelCard title="Cobrado, últimos doce meses">
          {i.porMes.every((m) => m.total === 0) ? (
            <EmptyState compact description="Cuando apruebes el primer pedido, aquí verás lo cobrado mes a mes." title="Todavía no hay cobros" />
          ) : (
            <div className="flex flex-col">
              {i.porMes.map((fila) => (
                <BarRow key={fila.mes} label={MES.format(new Date(`${fila.mes}-01T00:00:00Z`))} ratio={fila.total / techoMes} value={fila.total === 0 ? '—' : bs(fila.total)} wide />
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard title="Por mes del evento">
          <p className="-mt-2 mb-3 text-[12px] text-ink-mute">Lo vendido para los eventos de los próximos seis meses; en oro, lo que aún espera su pago.</p>
          <div className="flex flex-col">
            {a.porMesDelEvento.map((m) => (
              <div className="flex items-center gap-3 py-1.5" key={m.mes}>
                <span className="w-16 shrink-0 text-[12.5px] text-ink-soft">{MES.format(new Date(`${m.mes}-01T00:00:00Z`))}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-sage" style={{ width: `${(m.cobrado / techoEvento) * 100}%` }} />
                  <span className="absolute inset-y-0 rounded-full bg-gold/60" style={{ left: `${(m.cobrado / techoEvento) * 100}%`, width: `${(m.abierto / techoEvento) * 100}%` }} />
                </span>
                <span className="w-28 shrink-0 text-right font-mono text-[11.5px] text-ink [font-variant-numeric:lining-nums]">{m.cobrado + m.abierto === 0 ? '—' : bs(m.cobrado + m.abierto)}</span>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Por fiesta">
          {a.porFiesta.length === 0 ? (
            <EmptyState compact title="Todavía no hay ventas cobradas" />
          ) : (
            <div className="flex flex-col">
              {a.porFiesta.map((f) => (
                <BarRow key={String(f.fiesta)} label={`${nombreDeFiesta(f.fiesta)} · ${f.ventas}`} ratio={f.total / techoFiesta} tone="gold" value={bs(f.total)} wide />
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard title="Por plan">
          {i.porPlan.length === 0 ? (
            <EmptyState compact title="Todavía no hay pedidos aprobados" />
          ) : (
            <div className="flex flex-col">
              {i.porPlan.map((fila) => (
                <BarRow key={fila.plan} label={`${fila.plan} · ${fila.pedidos}`} ratio={fila.total / techoPlan} tone="gold" value={bs(fila.total)} wide />
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard title="Temporadas">
          {a.temporadas.length === 0 ? (
            <EmptyState compact description="Con tres ventas cobradas de una fiesta, aquí verás en qué meses del año se compra más." title="Aún pocas ventas para verlo" />
          ) : (
            <ul className="flex flex-col gap-3">
              {a.temporadas.map((t) => (
                <li className="flex items-start gap-3" key={t.fiesta}>
                  <EtiquetaDeFiesta fiesta={t.fiesta} />
                  <p className="text-[13.5px] leading-relaxed text-ink">
                    Se compran sobre todo en <b className="font-medium">{t.meses.join(' y ')}</b>
                    <span className="text-ink-mute"> · {plural(t.ventas, 'venta', 'ventas')}</span>
                    {t.meses[0] === undefined ? null : (
                      <span className="block text-[12px] text-ink-mute">Prepara promociones y mensajes un mes antes de {t.meses[0]}.</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11.5px] text-ink-mute">Hoy es {MES_LARGO.format(new Date(`${hoy}T00:00:00Z`))}.</p>
        </PanelCard>

        <PanelCard title="De dónde llegan y por qué se pierden">
          {a.origenes.length === 0 && a.motivosDePerdida.length === 0 ? (
            <EmptyState compact title="Todavía no hay consultas" />
          ) : (
            <div className="flex flex-col gap-5">
              {a.origenes.length === 0 ? null : (
                <div className="flex flex-col">
                  {a.origenes.map((o) => (
                    <BarRow key={o.origen} label={o.origen} ratio={o.consultas / techoOrigen} value={`${o.ganadas}/${o.consultas}`} />
                  ))}
                  <p className="mt-1 text-[11.5px] text-ink-mute">Compradas sobre consultas, por origen.</p>
                </div>
              )}
              {a.motivosDePerdida.length === 0 ? null : (
                <ul className="flex flex-col gap-1.5 border-t border-line-panel pt-4">
                  {a.motivosDePerdida.map((m) => (
                    <li className="flex justify-between text-[13px]" key={m.motivo}>
                      <span className="text-ink-soft">{m.motivo}</span>
                      <span className="font-mono text-ink">{m.veces}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </PanelCard>
      </div>

      <PanelCard className="mt-4.5" title="Últimos cobros">
        {i.ultimos.length === 0 ? (
          <EmptyState compact description="Cada pedido que apruebes aparece aquí con su importe." title="Todavía no se ha aprobado ningún pedido" />
        ) : (
          <ul className="flex flex-col">
            {i.ultimos.map((p) => (
              <li className="border-t border-line-panel first:border-none" key={p.ref}>
                {/* En el celular: nombre e importe arriba; referencia, plan y fecha debajo. */}
                <Link className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 py-3 transition-colors hover:bg-bg-sunken/50 min-[700px]:grid-cols-[6rem_minmax(0,1fr)_auto_7rem]" href={`/panel/admin/ventas?venta=p-${p.ref}`}>
                  <span className="order-3 font-mono text-[11px] tracking-[0.15em] text-ink-mute min-[700px]:order-none">{p.ref}</span>
                  <span className="order-1 min-w-0 truncate text-[14px] text-ink min-[700px]:order-none">
                    {p.customerName}
                    <span className="ml-2 text-[12px] text-ink-mute">{p.planName ?? 'Sin plan'}</span>
                  </span>
                  <span className="order-4 text-right text-[12px] text-ink-mute min-[700px]:order-none min-[700px]:text-left">{p.decidedAt ? fechaHora(p.decidedAt) : ''}</span>
                  <span className="order-2 text-right font-display text-[20px] text-ink [font-variant-numeric:lining-nums] min-[700px]:order-none">{bs(p.amountCents ?? 0)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </>
  )
}

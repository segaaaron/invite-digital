import Link from 'next/link'
import { admin } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard, StatCard } from '@/shared/design/ui/panel/cards'
import { BarRow, PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Ingresos · Administración' }
export const dynamic = 'force-dynamic'

const MES = new Intl.DateTimeFormat('es-BO', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const FECHA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/La_Paz' })

/** Todo se vende en BOB hoy. Si un día hay dos monedas, sumarlas sería mentir: se separan. */
const MONEDA = 'BOB'
const bs = (cents: number) => formatAmount(cents, MONEDA)

/**
 * Lo cobrado por el Plan B: pedidos aprobados, con el importe que costaban al pedirse.
 * No hay cobro en línea, así que «cobrado» es «aprobado por el admin tras ver el
 * comprobante».
 */
export default async function AdminIngresosPage() {
  await requireAdmin()
  const ingresos = await admin.income()

  if (isErr(ingresos)) {
    return (
      <>
        <PanelHeader kicker="Administración" title="Ingresos" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer los ingresos. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  const i = ingresos.value
  const techoMes = Math.max(1, ...i.porMes.map((m) => m.total))
  const techoPlan = Math.max(1, ...i.porPlan.map((p) => p.total))

  return (
    <>
      <PanelHeader kicker="Administración" meta="Pedidos aprobados, con el precio que tenían al pedirse" title="Ingresos" />

      {i.sinImporte > 0 ? (
        <div className="mb-4.5">
          <PanelAlert tone="error">
            {i.sinImporte} pedido{i.sinImporte === 1 ? '' : 's'} aprobado{i.sinImporte === 1 ? '' : 's'} sin importe (sin plan): no suman aquí.
          </PanelAlert>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 min-[560px]:gap-4.5 min-[900px]:grid-cols-4">
        <StatCard detail="Aprobado en el mes en curso" label="Este mes" value={bs(i.esteMes)} />
        <StatCard detail="Desde el 1 de enero" label="Este año" value={bs(i.esteAnio)} />
        <StatCard detail={`${i.aprobados} pedidos aprobados`} label="Ticket medio" value={i.ticketMedio === null ? '—' : bs(i.ticketMedio)} />
        <StatCard detail={`${bs(i.sinPago)} en pedidos sin comprobante`} label="Por revisar" value={bs(i.porRevisar)} />
      </div>

      <div className="mt-4.5 grid gap-4.5 min-[900px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <PanelCard title="Últimos doce meses">
          <div className="flex flex-col">
            {i.porMes.map((fila) => (
              <BarRow
                key={fila.mes}
                label={MES.format(new Date(`${fila.mes}-01T00:00:00Z`))}
                ratio={fila.total / techoMes}
                value={fila.total === 0 ? '—' : bs(fila.total)}
                wide
              />
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Por plan">
          {i.porPlan.length === 0 ? (
            <p className="text-[13px] text-ink-mute">Todavía no hay pedidos aprobados.</p>
          ) : (
            <div className="flex flex-col">
              {i.porPlan.map((fila) => (
                // El número de pedidos va en el rótulo: la columna del importe no da para los dos.
                <BarRow key={fila.plan} label={`${fila.plan} · ${fila.pedidos}`} ratio={fila.total / techoPlan} tone="gold" value={bs(fila.total)} wide />
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      <PanelCard className="mt-4.5" title="Últimos cobros">
        {i.ultimos.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-mute">Todavía no se ha aprobado ningún pedido.</p>
        ) : (
          <ul className="flex flex-col">
            {i.ultimos.map((p) => (
              <li key={p.ref} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line-panel py-3 first:border-none">
                <span className="w-24 font-mono text-[11px] tracking-[0.15em] text-ink-mute">{p.ref}</span>
                <span className="min-w-0 flex-1 text-[14px] text-ink">
                  {p.customerName}
                  <span className="ml-2 text-[12px] text-ink-mute">{p.planName ?? 'Sin plan'}</span>
                </span>
                <span className="text-[12px] text-ink-mute">{p.decidedAt ? FECHA.format(p.decidedAt) : ''}</span>
                {p.eventSlug ? (
                  <Link className="text-[12px] text-sage underline underline-offset-2" href={`/panel/eventos/${p.eventSlug}/configuracion`}>
                    Ver boda
                  </Link>
                ) : null}
                <span className="w-28 text-right font-display text-[20px] text-ink [font-variant-numeric:lining-nums]">
                  {bs(p.amountCents ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </>
  )
}

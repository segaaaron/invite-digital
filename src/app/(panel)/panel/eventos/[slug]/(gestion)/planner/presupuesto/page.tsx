import { notFound } from 'next/navigation'
import { events, planner } from '@/app/composition/container'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { fiestaDeTema } from '@/modules/events'
import { requireSession } from '@/modules/identity/session-cookie'
import {
  categoriasDe,
  cuentasDePartida,
  nombreDeCategoria,
  nombreDePagador,
  PAGADORES,
  porPagador,
  presupuestoACsv,
  totalesDelPresupuesto,
} from '@/modules/planner'
import { BudgetBoard, BudgetCsvButton, ItemForm } from '@/modules/planner/ui/BudgetBoard'
import { DEFAULT_CURRENCY, formatAmount } from '@/modules/registry'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/modules/shell/ui/cards'
import { fecha } from '@/shared/format/fecha'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Presupuesto' }
export const dynamic = 'force-dynamic'

const bs = (cents: number) => formatAmount(cents, DEFAULT_CURRENCY)
/** El importe como se escribe en el campo: `1234.50`. */
const campo = (cents: number) => `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')}`

export default async function PresupuestoPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ panel?: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const { panel } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const fiesta = fiestaDeTema(event.value.themeKey)
  const hoy = fechaEnBolivia(new Date())
  const partidas = await planner.listBudget(event.value.id)
  const totales = totalesDelPresupuesto(partidas)
  const evento = { eventId: event.value.id, eventSlug: event.value.slug }
  const opciones = { categorias: categoriasDe(fiesta), pagadores: PAGADORES.map((clave) => ({ clave, nombre: nombreDePagador(fiesta, clave) })) }
  const base = `/panel/eventos/${event.value.slug}/planner/presupuesto`

  const vistas = partidas.map((p) => {
    const c = cuentasDePartida(p)
    return {
      id: p.id,
      category: p.category,
      categoria: nombreDeCategoria(fiesta, p.category),
      concept: p.concept,
      payer: p.payer,
      quienPaga: p.payer === 'padrino' && p.padrinoLabel ? `${nombreDePagador(fiesta, 'padrino')} · ${p.padrinoLabel}` : nombreDePagador(fiesta, p.payer),
      padrinoLabel: p.padrinoLabel,
      notes: p.notes,
      previsto: bs(c.previsto),
      contratado: c.contratado === null ? null : bs(c.contratado),
      pagado: bs(c.pagado),
      falta: bs(c.falta),
      campoPrevisto: campo(p.estimatedCents),
      campoContratado: p.contractedCents === null ? '' : campo(p.contractedCents),
      pagos: p.pagos.map((g) => ({
        id: g.id,
        importe: bs(g.amountCents),
        etiqueta: g.label ? g.label.charAt(0).toUpperCase() + g.label.slice(1) : null,
        vence: g.dueDate === null ? null : fecha(new Date(`${g.dueDate}T12:00:00.000Z`)),
        pagado: g.paidAt !== null,
        atrasado: g.paidAt === null && g.dueDate !== null && g.dueDate < hoy,
      })),
    }
  })

  return (
    <>
      <PanelHeader
        actions={
          <>
            {partidas.length > 0 ? <BudgetCsvButton csv={presupuestoACsv(partidas, fiesta)} nombre={`presupuesto-${event.value.slug}.csv`} /> : null}
            <PanelButton href={`${base}?panel=partida`} variant="primary">
              Sumar partida
            </PanelButton>
          </>
        }
        kicker="Planner"
        meta={`${partidas.length} partida${partidas.length === 1 ? '' : 's'} · falta pagar ${bs(totales.falta)}`}
        title="Presupuesto"
      />

      <div className="flex flex-col gap-4.5">
        {panel === 'partida' ? (
          <PanelCard title="Partida nueva">
            <ItemForm evento={evento} opciones={opciones} />
          </PanelCard>
        ) : null}

        {partidas.length === 0 ? null : (
          <div className="grid gap-4.5 min-[900px]:grid-cols-2">
            <PanelCard title="Totales">
              <dl className="grid grid-cols-2 gap-4 [font-variant-numeric:tabular-nums]">
                {[
                  ['Previsto', bs(totales.previsto)],
                  ['Comprometido', bs(totales.comprometido)],
                  ['Pagado', bs(totales.pagado)],
                  ['Falta', bs(totales.falta)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">{k}</dt>
                    <dd className="font-display text-[26px] font-light text-ink [font-variant-numeric:lining-nums]">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className={`mt-3 text-[13px] ${totales.desvio > 0 ? 'text-danger-deep' : 'text-ink-soft'}`} role={totales.desvio > 0 ? 'alert' : undefined}>
                {totales.desvio > 0
                  ? `Vas ${bs(totales.desvio)} por encima de lo previsto.`
                  : totales.desvio < 0
                    ? `Vas ${bs(-totales.desvio)} por debajo de lo previsto.`
                    : 'Justo en lo previsto.'}
              </p>
            </PanelCard>
            <PanelCard title="Quién aporta">
              <ul className="flex flex-col">
                {porPagador(partidas, fiesta).map((f) => (
                  <li className="flex items-baseline justify-between gap-3 border-b border-line-panel py-2 text-[13px] last:border-none [font-variant-numeric:tabular-nums]" key={f.nombre}>
                    <span className="text-ink">{f.nombre}</span>
                    <span className="text-ink-soft">
                      {bs(f.pagado)} de {bs(f.comprometido)}
                    </span>
                  </li>
                ))}
              </ul>
            </PanelCard>
          </div>
        )}

        <BudgetBoard evento={evento} opciones={opciones} partidas={vistas} />
      </div>
    </>
  )
}

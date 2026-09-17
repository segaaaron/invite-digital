import { notFound } from 'next/navigation'
import { events, planner } from '@/app/composition/container'
import { fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { fiestaDeTema } from '@/modules/events'
import { gestionaElEvento } from '@/modules/identity'
import { requireSession } from '@/app/_acciones/sesion'
import {
  categoriasDe,
  cuentasDePartida,
  nombreDeCategoria,
  nombreDePagador,
  PAGADORES,
  porPagador,
  pagosQueVencen,
  presupuestoACsv,
  resumenPorCategoria,
  totalesDelPresupuesto,
} from '@/modules/planner'
import { BudgetBoard, BudgetCsvButton, ItemForm } from '@/modules/planner/ui/BudgetBoard'
import { BudgetOverview, BudgetStart } from '@/modules/planner/ui/BudgetPlanCard'
import { DEFAULT_CURRENCY, formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { fecha } from '@/shared/format/fecha'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Presupuesto' }
export const dynamic = 'force-dynamic'

const bs = (cents: number) => formatAmount(cents, DEFAULT_CURRENCY)
/** El importe como se escribe en el campo: `1234.50`. */
const campo = (cents: number) => `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')}`

export default async function PresupuestoPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ panel?: string; categoria?: string }> }) {
  const actor = await requireSession()
  const { slug } = await params
  const { panel, categoria } = await searchParams

  const event = await events.getFor(actor, slug, { section: 'cliente' })
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const fiesta = fiestaDeTema(event.value.themeKey)
  // El dinero lo llevan el anfitrión y su planner; el co-anfitrión lo ve sin tocarlo.
  const dueno = gestionaElEvento(actor, event.value)
  const editable = dueno || (await events.staff.membershipsOf(event.value.id, actor.userId)).some((m) => m === 'cliente' || m === 'planner')
  const hoy = fechaEnBolivia(new Date())
  const partidas = await planner.listBudget(event.value.id)
  const totales = totalesDelPresupuesto(partidas)
  const evento = { eventId: event.value.id, eventSlug: event.value.slug }
  const opciones = { categorias: categoriasDe(fiesta), pagadores: PAGADORES.map((clave) => ({ clave, nombre: nombreDePagador(fiesta, clave) })) }
  const base = `/panel/eventos/${event.value.slug}/planner/presupuesto`

  // El total y su reparto: el punto de partida del presupuesto.
  const plan = await planner.getBudgetPlan(event.value.id)
  const vistaDelPlan =
    plan === null
      ? null
      : {
          total: bs(plan.totalCents),
          comprometido: bs(totales.comprometido),
          pagado: bs(totales.pagado),
          queda: bs(Math.abs(plan.totalCents - totales.comprometido)),
          pasado: totales.comprometido > plan.totalCents,
          avance: plan.totalCents === 0 ? 0 : totales.comprometido / plan.totalCents,
          campoTotal: campo(plan.totalCents),
        }
  const categoriasVista =
    plan === null
      ? []
      : resumenPorCategoria(partidas, fiesta, plan.asignaciones).map((c) => ({
          clave: c.clave,
          nombre: c.nombre,
          asignado: bs(c.asignado),
          comprometido: bs(c.comprometido),
          pagado: bs(c.pagado),
          avance: c.asignado === 0 ? (c.comprometido > 0 ? 1 : 0) : c.comprometido / c.asignado,
          estado: c.estado,
          partidas: c.partidas,
          campoAsignado: campo(c.asignado),
        }))
  const proximos = pagosQueVencen(partidas, hoy)

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
            {editable ? (
              <PanelButton href={`${base}?panel=partida`} variant="primary">
                Anotar un gasto
              </PanelButton>
            ) : null}
          </>
        }
        kicker="Planner"
        meta={plan === null ? 'Empieza por cuánto quieres gastar' : `${partidas.length} gasto${partidas.length === 1 ? '' : 's'} anotado${partidas.length === 1 ? '' : 's'} · falta pagar ${bs(totales.falta)}`}
        title="Presupuesto"
      />

      <div className="flex flex-col gap-4.5">
        {panel === 'partida' && editable ? (
          <PanelCard title="Partida nueva">
            <ItemForm categoria={categoria} evento={evento} opciones={opciones} />
          </PanelCard>
        ) : null}

        <PanelCard title={plan === null ? '¿Cuánto quieres gastar?' : 'Tu presupuesto'}>
          {vistaDelPlan === null ? (
            editable ? <BudgetStart evento={evento} /> : <p className="text-[13px] text-ink-soft">Todavía no se fijó el presupuesto total.</p>
          ) : (
            <BudgetOverview categorias={categoriasVista} editable={editable} evento={evento} plan={vistaDelPlan} />
          )}
        </PanelCard>

        {proximos.length === 0 && partidas.length === 0 ? null : (
          <div className="grid gap-4.5 min-[900px]:grid-cols-2">
            <PanelCard title="Próximos pagos">
              {proximos.length === 0 ? (
                <p className="text-[13px] text-ink-soft">Nada vence en los próximos siete días.</p>
              ) : (
                <ul className="flex flex-col">
                  {proximos.map((g) => (
                    <li className="flex items-baseline justify-between gap-3 border-b border-line-panel py-2 text-[13px] last:border-none [font-variant-numeric:tabular-nums]" key={g.id}>
                      <span className="text-ink">
                        {g.concepto}
                        <span className="block text-[11px] text-ink-mute">{g.dueDate! < hoy ? 'Vencido' : 'Vence'} el {fecha(new Date(`${g.dueDate}T12:00:00.000Z`))}</span>
                      </span>
                      <span className={g.dueDate! < hoy ? 'text-danger-deep' : 'text-ink-soft'}>{bs(g.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
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

        <BudgetBoard editable={editable} evento={evento} opciones={opciones} partidas={vistas} />
      </div>
    </>
  )
}

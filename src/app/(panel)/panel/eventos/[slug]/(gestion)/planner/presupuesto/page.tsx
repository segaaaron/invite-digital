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
import { BudgetStart, MarcarPagado, RegistrarPagoForm, RepartoForm } from '@/modules/planner/ui/BudgetPlanCard'
import { DEFAULT_CURRENCY, formatAmount } from '@/shared/money'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { fecha } from '@/shared/format/fecha'
import { PanelButton, Pill, TARJETA_DESTACADA } from '@/shared/design/ui/panel/PanelKit'
import { PanelDialog } from '@/shared/design/ui/panel/PanelDialog'
import { AccionDeLaIsla } from '@/shared/design/ui/panel/AccionDeLaIsla'
import { PlusIcon } from '@/shared/design/ui/icons'
import Link from 'next/link'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Presupuesto' }
export const dynamic = 'force-dynamic'

/** «Bs 85.000»: las cifras del presupuesto sin céntimos, como la maqueta (E23); con céntimos solo si los hay. */
const bs = (cents: number) => formatAmount(cents, DEFAULT_CURRENCY).replace(/,00$/, '')

/** El color de cada categoría, en el orden en que aparecen: la barra y el punto de la fila. */
const COLORES = ['bg-reparto-1', 'bg-reparto-2', 'bg-reparto-3', 'bg-reparto-4', 'bg-reparto-5', 'bg-reparto-6'] as const
const DIA_SEMANA = new Intl.DateTimeFormat('es-BO', { weekday: 'long', timeZone: 'UTC' })
const DIA_Y_NUMERO = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** Qué le queda a la categoría, en palabras: «Pagado», «Falta Bs 6.750», «Te pasaste» o «Libre». */
function estadoDeFila(c: { asignado: number; comprometido: number; pagado: number }): { texto: string; tono: 'ok' | 'laton' | 'no' | 'neutro' } {
  if (c.asignado > 0 && c.comprometido > c.asignado) return { texto: 'Te pasaste', tono: 'no' }
  if (c.comprometido - c.pagado > 0) return { texto: `Falta ${bs(c.comprometido - c.pagado)}`, tono: 'laton' }
  if (c.comprometido > 0 && c.comprometido >= c.asignado) return { texto: 'Pagado', tono: 'ok' }
  return { texto: 'Libre', tono: 'neutro' }
}
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
  const editable = dueno || (await events.staff.de(actor, event.value.id)).some((m) => m === 'cliente' || m === 'planner')
  const hoy = fechaEnBolivia(new Date())
  const partidas = await planner.listBudget(event.value.id)
  const totales = totalesDelPresupuesto(partidas)
  const evento = { eventId: event.value.id, eventSlug: event.value.slug }
  const opciones = { categorias: categoriasDe(fiesta), pagadores: PAGADORES.map((clave) => ({ clave, nombre: nombreDePagador(fiesta, clave) })) }
  const base = `/panel/eventos/${event.value.slug}/planner/presupuesto`

  // El total y su reparto: el punto de partida del presupuesto.
  const plan = await planner.getBudgetPlan(event.value.id)
  const resumen = plan === null ? [] : resumenPorCategoria(partidas, fiesta, plan.asignaciones)
  const sinAsignar = plan === null ? 0 : plan.totalCents - resumen.reduce((n, c) => n + c.asignado, 0)
  const filas = [
    ...resumen
      .filter((c) => c.asignado > 0 || c.comprometido > 0)
      .map((c, i) => ({ ...c, color: COLORES[i % COLORES.length] ?? COLORES[0] })),
    ...(sinAsignar > 0 ? [{ clave: 'sin-asignar', nombre: 'Sin asignar', asignado: sinAsignar, comprometido: 0, pagado: 0, partidas: 0, estado: 'libre' as const, color: 'bg-line-panel-strong' }] : []),
  ]
  const libre = plan === null ? 0 : plan.totalCents - totales.comprometido
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

  const primero = proximos[0]
  const quePago = (g: (typeof proximos)[number]) => {
    const partida = partidas.find((p) => p.id === g.partidaId)
    const etiqueta = partida?.pagos.find((x) => x.id === g.id)?.label
    return etiqueta ? `${g.concepto}, ${etiqueta}` : g.concepto
  }
  const pendientes = partidas.flatMap((p) =>
    p.pagos.filter((g) => g.paidAt === null).map((g) => ({ id: g.id, texto: `${g.label ? `${p.concept}, ${g.label}` : p.concept} (${bs(g.amountCents)})` })),
  )
  const cifras: { nombre: string; valor: string; nota?: string; tono?: string }[] =
    plan === null
      ? []
      : [
          { nombre: 'Total', valor: bs(plan.totalCents) },
          { nombre: 'Pagado', valor: bs(totales.pagado) },
          {
            nombre: 'Por pagar',
            valor: bs(totales.falta),
            tono: 'text-gold-deep',
            ...(primero?.dueDate ? { nota: primero.dueDate < hoy ? 'Hay un pago vencido' : `El próximo vence el ${DIA_SEMANA.format(new Date(`${primero.dueDate}T00:00:00Z`))}` } : {}),
          },
          { nombre: libre < 0 ? 'Te pasaste' : 'Libre', valor: bs(Math.abs(libre)), ...(libre < 0 ? { tono: 'text-danger-deep' } : {}) },
        ]

  return (
    <>
      <PanelHeader
        actions={
          editable && plan !== null ? (
            <span className="flex flex-wrap gap-2.5">
              <PanelButton href={`${base}?panel=reparto`}>Ajustar el reparto</PanelButton>
              <PanelButton href={`${base}?panel=pago`} variant="primary">
                <PlusIcon className="size-4" /> Registrar un pago
              </PanelButton>
            </span>
          ) : null
        }
        meta={plan === null ? 'Empieza por cuánto quieres gastar.' : 'Cuánto tienes, en qué se va y lo que falta pagar.'}
        title="Presupuesto"
      />

      {editable ? (
        <AccionDeLaIsla>
          <Link aria-label="Anotar un gasto" className="flex min-h-11 items-center gap-1 rounded-full border border-line-panel-strong bg-bg-raised px-3.5 text-[14px] font-medium text-ink no-underline" href={`${base}?panel=partida`}>
            <PlusIcon className="size-4.5" />
          Añadir
          </Link>
        </AccionDeLaIsla>
      ) : null}

      {panel === 'partida' && editable ? (
        <PanelDialog closeHref={base} title="Anotar un gasto" width={620}>
          <ItemForm categoria={categoria} cerrarEn={base} evento={evento} opciones={opciones} />
        </PanelDialog>
      ) : null}
      {panel === 'reparto' && editable && plan !== null ? (
        <PanelDialog closeHref={base} title="Ajustar el reparto" width={620}>
          <RepartoForm categorias={resumen.map((c) => ({ clave: c.clave, nombre: c.nombre, campoAsignado: campo(c.asignado) }))} evento={evento} />
        </PanelDialog>
      ) : null}
      {panel === 'pago' && editable ? (
        <PanelDialog closeHref={base} descripcion="Se descuenta de lo que falta pagar." title="Registrar un pago">
          {pendientes.length === 0 ? (
            <p className="text-[15px] text-ink-soft">No hay pagos por registrar. Anota los pagos de cada gasto —anticipo, cuota, saldo— con su fecha, y aquí los marcas hechos.</p>
          ) : (
            <RegistrarPagoForm cerrar={base} evento={evento} pendientes={pendientes} />
          )}
        </PanelDialog>
      ) : null}

      {plan === null ? (
        <PanelCard title="¿Cuánto quieres gastar?">
          {editable ? <BudgetStart evento={evento} /> : <p className="text-[14px] text-ink-soft">Todavía no se fijó el presupuesto total.</p>}
        </PanelCard>
      ) : (
        <div className="flex flex-col gap-7">
          {/* Las cuatro cifras (E23); en el celular, el total grande y las otras tres debajo (M14). */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-3 min-[768px]:grid-cols-4 [font-variant-numeric:lining-nums_tabular-nums]">
            {cifras.map((c, i) => (
              <div className={`min-w-0 min-[768px]:border-l min-[768px]:border-line-panel min-[768px]:pl-5 min-[768px]:first:border-none min-[768px]:first:pl-0 ${i === 0 ? 'col-span-3 min-[768px]:col-span-1' : ''}`} key={c.nombre}>
                <p className={`text-[14px] text-ink-mute ${i === 0 ? 'max-[767px]:sr-only' : ''}`}>{c.nombre}</p>
                <p className={`font-display font-medium ${i === 0 ? 'text-[48px] leading-none min-[768px]:text-[34px]' : 'text-[22px] min-[768px]:text-[34px]'} leading-tight ${c.tono ?? 'text-ink'} ${c.tono === 'text-gold-deep' ? 'min-[768px]:text-ink' : ''}`}>{c.valor}</p>
                {c.nota ? <p className="mt-0.5 text-[13px] text-gold-deep max-[767px]:hidden">{c.nota}</p> : null}
              </div>
            ))}
          </div>

          {/* El reparto en una barra: cada categoría lo que comprometió, del color de su punto. */}
          <div aria-hidden className="flex h-2.5 overflow-hidden rounded-full bg-line-panel">
            {filas
              .filter((f) => f.comprometido > 0)
              .map((f) => (
                <span className={`h-full ${f.color}`} key={f.clave} style={{ width: `${(f.comprometido / Math.max(plan.totalCents, totales.comprometido)) * 100}%` }} />
              ))}
          </div>

          {primero === undefined ? null : (
            <section aria-label="Próximos pagos" className={`${TARJETA_DESTACADA} flex flex-wrap items-center gap-x-8 gap-y-4 px-7 py-5 max-[767px]:flex-col max-[767px]:items-stretch max-[767px]:px-5`}>
              <h2 className="font-display text-[24px] font-medium max-[767px]:hidden">Próximos pagos</h2>
              <p className="text-[14px] text-ink-mute min-[768px]:hidden">
                Próximo pago, {primero.dueDate ? DIA_Y_NUMERO.format(new Date(`${primero.dueDate}T00:00:00Z`)) : 'sin fecha'}
              </p>
              {proximos.slice(0, 2).map((g, i) => (
                <div className={`flex flex-col gap-0.5 min-[768px]:border-l min-[768px]:border-line-panel min-[768px]:pl-8 ${i > 0 ? 'max-[767px]:hidden' : ''}`} key={g.id}>
                  <span className="text-[13px] text-ink-mute max-[767px]:hidden">
                    {g.dueDate === null ? 'Sin fecha' : g.dueDate < hoy ? 'Vencido' : mayuscula(DIA_Y_NUMERO.format(new Date(`${g.dueDate}T00:00:00Z`)))}
                  </span>
                  <span className="flex items-baseline justify-between gap-3 text-[15px] max-[767px]:font-medium">
                    {mayuscula(quePago(g))}
                    <span className="font-display text-[22px] font-medium [font-variant-numeric:lining-nums]">{bs(g.amountCents)}</span>
                  </span>
                </div>
              ))}
              {editable ? (
                <span className="min-[768px]:ml-auto">
                  <span className="max-[767px]:hidden">
                    <MarcarPagado evento={evento} paymentId={primero.id}>
                      Marcar {primero.concepto.charAt(0).toLowerCase() + primero.concepto.slice(1)} como pagado
                    </MarcarPagado>
                  </span>
                  <span className="min-[768px]:hidden">
                    <MarcarPagado ancho evento={evento} paymentId={primero.id}>
                      Marcar como pagado
                    </MarcarPagado>
                  </span>
                </span>
              ) : null}
            </section>
          )}

          {/* Por categoría (E23): asignado, comprometido, pagado, el avance de lo pagado y qué le queda. */}
          <section aria-label="Por categoría">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_minmax(0,1.2fr)_minmax(0,1fr)] gap-4 border-b border-line-panel-strong px-2 pb-2.5 text-[13px] font-medium text-ink-mute min-[860px]:grid">
              <span>Categoría</span>
              <span>Asignado</span>
              <span>Comprometido</span>
              <span>Pagado</span>
              <span>Avance</span>
              <span>Estado</span>
            </div>
            <ul>
              {filas.map((f) => {
                const estado = estadoDeFila(f)
                return (
                  <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line-panel px-2 py-3.5 text-[14.5px] min-[860px]:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_minmax(0,1.2fr)_minmax(0,1fr)] max-[859px]:px-0 max-[859px]:py-4 [font-variant-numeric:tabular-nums]" key={f.clave}>
                    <span className="flex items-center gap-3 max-[859px]:items-start">
                      <span aria-hidden className={`size-2.5 shrink-0 rounded-[3px] max-[859px]:mt-1.5 ${f.color}`} />
                      <span className="flex flex-col">
                        <span className="max-[859px]:text-[17px] max-[859px]:font-medium">{f.nombre}</span>
                        <span className="text-[14px] text-ink-mute min-[860px]:hidden">{bs(f.asignado)}</span>
                      </span>
                    </span>
                    <span className="max-[859px]:hidden">{bs(f.asignado)}</span>
                    <span className="max-[859px]:hidden">{bs(f.comprometido)}</span>
                    <span className="max-[859px]:hidden">{bs(f.pagado)}</span>
                    <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-line-panel max-[859px]:hidden min-[860px]:mr-6">
                      <span className="block h-full rounded-full bg-shell-deep" style={{ width: `${f.asignado === 0 ? 0 : Math.min(100, (f.pagado / f.asignado) * 100)}%` }} />
                    </span>
                    <span>
                      <Pill tone={estado.tono === 'laton' ? 'vip' : estado.tono}>
                        {estado.texto === 'Libre' && f.asignado - f.comprometido > 0 ? (
                          <>
                            Libre<span className="min-[860px]:hidden"> {bs(f.asignado - f.comprometido)}</span>
                          </>
                        ) : (
                          estado.texto
                        )}
                      </Pill>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      {plan === null && partidas.length === 0 ? null : (
        <section aria-labelledby="cada-gasto" className="mt-12 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[26px] font-medium" id="cada-gasto">
                Cada gasto
              </h2>
              <p className="text-[14px] text-ink-mute">
                {porPagador(partidas, fiesta)
                  .map((f) => `${f.nombre}: ${bs(f.pagado)} de ${bs(f.comprometido)}`)
                  .join(' · ') || 'Lo que cuesta cada cosa, quién la paga y sus pagos.'}
              </p>
            </div>
            <span className="flex gap-2.5">
              {partidas.length > 0 ? <BudgetCsvButton csv={presupuestoACsv(partidas, fiesta)} nombre={`presupuesto-${event.value.slug}.csv`} /> : null}
              {editable ? (
                <PanelButton href={`${base}?panel=partida`}>
                  <PlusIcon className="size-4" /> Anotar un gasto
                </PanelButton>
              ) : null}
            </span>
          </div>
          <BudgetBoard editable={editable} evento={evento} opciones={opciones} partidas={vistas} />
        </section>
      )}
    </>
  )
}

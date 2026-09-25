import Link from 'next/link'
import { admin, catalog, leads, orders } from '@/app/composition/container'
import { requireAdmin } from '@/app/_acciones/sesion'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { ConsultationDetail } from '@/modules/leads/ui/ConsultationDetail'
import { vistaDeConsulta } from '@/modules/leads/ui/vista-de-consulta'
import type { Order, OrderStatus } from '@/modules/orders'
import { TarjetaDePedido } from '@/modules/orders/ui/TarjetaDePedido'
import { PanelHeader } from '@/modules/shell/ui/PanelHeader'
import { PanelCard } from '@/shared/design/ui/panel/cards'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { PanelLateral } from '@/shared/design/ui/panel/PanelLateral'
import { isErr } from '@/shared/result'

export const metadata = { title: 'Ventas · Administración' }
export const dynamic = 'force-dynamic'

const BASE = '/panel/admin/ventas'
const CORTA = new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', timeZone: 'America/La_Paz' })
const PRIORIDAD: readonly OrderStatus[] = ['proof_submitted', 'pending_payment', 'rejected', 'approved']
/** Lo cerrado se enseña reciente; el histórico entero está en Pedidos y en Resultados. */
const CERRADAS_A_LA_VISTA = 8

type Tarjeta = { readonly clave: string; readonly href: string; readonly nombre: string; readonly detalle: string; readonly cuando: string; readonly urgente?: boolean }
type Etapa = { readonly clave: string; readonly titulo: string; readonly ayuda: string; readonly tarjetas: readonly Tarjeta[]; readonly total: number; readonly accion?: boolean; readonly todas: string }

/**
 * **Ventas: de la primera consulta a la boda creada, en un tablero** (el embudo de HoneyBook,
 * Dubsado o el CRM de Zola). Consultas y pedidos eran dos bandejas que no se miraban; aquí son
 * las etapas del mismo camino, y lo que pide acción va resaltado.
 *
 * Cada tarjeta abre su detalle **en un panel lateral** (`?consulta=<id>`, `?pedido=<ref>`) sin
 * perder el tablero; ahí se contesta, se aprueba o se crea el evento. En el celular las etapas
 * se apilan: la misma lista, leída de arriba abajo.
 */
export default async function VentasPage({ searchParams }: { searchParams: Promise<{ consulta?: string; pedido?: string }> }) {
  await requireAdmin()
  const { consulta: consultaId, pedido: pedidoRef } = await searchParams

  const [nuevas, contactadas, enCurso, aprobados, categorias] = await Promise.all([
    leads.list('new'),
    leads.list('contacted'),
    orders.page({ status: null, tope: 200, prioridad: PRIORIDAD }),
    orders.page({ status: 'approved', tope: 60, prioridad: PRIORIDAD }),
    catalog.listCategories('es'),
  ])

  if (isErr(nuevas) || isErr(contactadas) || isErr(enCurso) || isErr(aprobados)) {
    return (
      <>
        <PanelHeader kicker="Administración" title="Ventas" />
        <PanelCard>
          <p className="text-[13px] text-danger" role="alert">
            No pudimos leer las ventas. La base no responde; vuelve a intentarlo en un momento.
          </p>
        </PanelCard>
      </>
    )
  }

  const ahora = new Date()
  const nombreCategoria = new Map(isErr(categorias) ? [] : categorias.value.map((c) => [c.slug, c.name]))
  const conteo = nuevas.value.conteo
  const pedidos = enCurso.value.pedidos.map((p) => p.order)
  const deEstado = (...estados: OrderStatus[]) => pedidos.filter((o) => estados.includes(o.status))
  const sinEvento = aprobados.value.pedidos.map((p) => p.order).filter((o) => o.eventSlug === null && o.addonSlug === null)
  const cerradas = aprobados.value.pedidos.map((p) => p.order).filter((o) => o.eventSlug !== null || o.addonSlug !== null)

  const deConsulta = (filas: typeof nuevas.value.filas): Tarjeta[] =>
    filas.map((c) => {
      const v = vistaDeConsulta(c, nombreCategoria, ahora)
      return {
        clave: c.id,
        href: `${BASE}?consulta=${c.id}`,
        nombre: c.name,
        detalle: [v.category, v.eventDateLabel].filter((x) => x !== null).join(' · ') || 'Sin detalles',
        cuando: v.espera?.texto ?? v.shortDateLabel,
        urgente: v.espera?.urgente ?? false,
      }
    })
  const dePedido = (lista: readonly Order[]): Tarjeta[] =>
    lista.map((o) => ({
      clave: o.id,
      href: `${BASE}?pedido=${o.publicRef}`,
      nombre: o.customerName,
      detalle: o.addonSlug === null ? (o.planName ?? 'Plan retirado') : `Extra · ${o.addonName ?? o.addonSlug}`,
      cuando: `${o.publicRef} · ${CORTA.format(o.createdAt)}`,
    }))

  const etapas: Etapa[] = [
    { clave: 'nuevas', titulo: 'Consultas nuevas', ayuda: 'Escribieron desde la web', tarjetas: deConsulta(nuevas.value.filas), total: conteo.new, accion: true, todas: '/panel/admin/consultas' },
    { clave: 'contactadas', titulo: 'Contactadas', ayuda: 'Ya les escribiste', tarjetas: deConsulta(contactadas.value.filas), total: conteo.contacted, todas: '/panel/admin/consultas?estado=contacted' },
    { clave: 'pago', titulo: 'Esperando pago', ayuda: 'Pidieron un plan', tarjetas: dePedido(deEstado('pending_payment', 'rejected')), total: enCurso.value.conteo.pending_payment + enCurso.value.conteo.rejected, todas: '/panel/pedidos?estado=pending_payment' },
    { clave: 'revisar', titulo: 'Por revisar', ayuda: 'Subieron su comprobante', tarjetas: dePedido(deEstado('proof_submitted')), total: enCurso.value.conteo.proof_submitted, accion: true, todas: '/panel/pedidos?estado=proof_submitted' },
    { clave: 'evento', titulo: 'Por crear el evento', ayuda: 'Pagado, falta su boda', tarjetas: dePedido(sinEvento), total: sinEvento.length, accion: true, todas: '/panel/pedidos?estado=approved' },
    { clave: 'cerradas', titulo: 'Cerradas', ayuda: 'Con su evento o su extra', tarjetas: dePedido(cerradas.slice(0, CERRADAS_A_LA_VISTA)), total: enCurso.value.conteo.approved - sinEvento.length, todas: '/panel/pedidos?estado=approved' },
  ]
  // Lo mismo que cuenta la insignia de la barra: consultas sin contestar y comprobantes por revisar.
  const porAtender = conteo.new + enCurso.value.conteo.proof_submitted

  return (
    <>
      <PanelHeader
        actions={<PanelButton href="/panel/admin/consultas?estado=lost">Perdidas ({conteo.lost})</PanelButton>}
        kicker="Administración"
        meta={porAtender === 0 ? 'Nada espera por ti ahora mismo' : `${porAtender} esperan por ti`}
        title="Ventas"
      />

      {/* Seis columnas que se reparten el ancho y, si no caben, se desplazan; en el celular, apiladas. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-3">
        <div className="flex flex-col gap-4 min-[900px]:grid min-[900px]:auto-cols-[minmax(176px,1fr)] min-[900px]:grid-flow-col min-[900px]:gap-3">
          {etapas.map((etapa) => (
            <section aria-labelledby={`etapa-${etapa.clave}`} className="flex min-w-0 flex-col rounded-[18px] border border-line-panel bg-bg-sunken/60 p-2.5" key={etapa.clave}>
              <header className="flex items-start justify-between gap-2 px-1.5 pt-1 pb-2.5">
                <span className="min-w-0">
                  <h2 className="truncate text-[13px] font-medium text-ink" id={`etapa-${etapa.clave}`}>
                    {etapa.titulo}
                  </h2>
                  <span className="block text-[11.5px] leading-snug text-ink-mute">{etapa.ayuda}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-display text-[15px] [font-variant-numeric:lining-nums] ${
                    etapa.accion === true && etapa.total > 0 ? 'bg-ink text-white' : 'text-ink-soft'
                  }`}
                >
                  {etapa.total}
                </span>
              </header>
              {etapa.tarjetas.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-line-panel px-3 py-5 text-center text-[12px] text-ink-mute">Nada aquí</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {etapa.tarjetas.map((t) => (
                    <li key={t.clave}>
                      <Link
                        className={`block rounded-[12px] border bg-white px-3 py-2.5 shadow-card transition-[border-color,box-shadow] hover:border-ink/50 hover:shadow-float focus-visible:outline-2 focus-visible:outline-ink ${
                          t.urgente === true ? 'border-danger/50' : 'border-line-panel'
                        }`}
                        href={t.href}
                        scroll={false}
                      >
                        <span className="block truncate font-display text-[16px] leading-tight text-ink">{t.nombre}</span>
                        <span className="mt-0.5 block truncate text-[12px] text-ink-soft">{t.detalle}</span>
                        <span className={`mt-1.5 block truncate text-[11px] ${t.urgente === true ? 'text-danger' : 'text-ink-mute'}`}>{t.cuando}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {etapa.total > etapa.tarjetas.length ? (
                <Link className="mt-2 px-1.5 text-[12px] text-ink-soft underline underline-offset-4 hover:text-ink" href={etapa.todas}>
                  Ver las {etapa.total}
                </Link>
              ) : null}
            </section>
          ))}
        </div>
      </div>

      {consultaId === undefined ? null : <CajonDeConsulta id={consultaId} nombreCategoria={nombreCategoria} ahora={ahora} />}
      {pedidoRef === undefined ? null : <CajonDePedido publicRef={pedidoRef} />}
    </>
  )
}

async function CajonDeConsulta({ id, nombreCategoria, ahora }: { id: string; nombreCategoria: ReadonlyMap<string, string>; ahora: Date }) {
  const [todas, eventos] = await Promise.all([leads.list(null), admin.events()])
  const fila = isErr(todas) ? undefined : todas.value.filas.find((c) => c.id === id)
  if (fila === undefined) return null
  const consulta = vistaDeConsulta(fila, nombreCategoria, ahora)
  return (
    <PanelLateral closeHref={BASE} title="Consulta">
      <ConsultationDetail consulta={consulta} eventos={isErr(eventos) ? [] : eventos.value.map((e) => ({ id: e.id, title: e.title }))} key={consulta.id + consulta.status} />
    </PanelLateral>
  )
}

async function CajonDePedido({ publicRef }: { publicRef: string }) {
  const leido = await orders.byRef(publicRef)
  if (isErr(leido)) return null
  const { order, proofs } = leido.value
  return (
    <PanelLateral closeHref={BASE} title={`Pedido ${order.publicRef}`}>
      <TarjetaDePedido diseno={order.templateSlug === null ? null : themeFor(order.templateSlug).label} order={order} proofs={proofs} />
    </PanelLateral>
  )
}

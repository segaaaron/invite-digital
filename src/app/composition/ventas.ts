import { componerVentas, type ConsultaDeVenta, type FiestaDeVenta, type PedidoDeVenta, type Venta } from '@/modules/admin/domain/ventas'
import { componerHoy, fechaEnBolivia } from '@/modules/admin/domain/hoy'
import { saludDelEvento } from '@/modules/admin/domain/salud'
import { fiestaDeTema } from '@/modules/events'
import type { Order } from '@/modules/orders'
import type { ConsultationRow } from '@/modules/leads/application/ports'
import { err, isErr, ok, type Result } from '@/shared/result'
import { catalog, leads } from './web'
import { admin, orders, plans } from './negocio'
import { opinionesDe } from './acompanamiento'

/** Las categorías del formulario que son una fiesta que el admin vende; bautizo o corporativo, no. */
const FIESTA_DE_CATEGORIA: Readonly<Record<string, Exclude<FiestaDeVenta, null>>> = {
  boda: 'boda',
  'boda-civil': 'boda',
  'xv-anos': 'xv',
  cumpleanos: 'cumple',
}

/** El tope de pedidos que se leen para el embudo: bastante más que los abiertos de un año. */
const TOPE_DE_PEDIDOS = 2000

export const aConsultaDeVenta = (c: ConsultationRow, nombreCategoria: ReadonlyMap<string, string>): ConsultaDeVenta => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  fiesta: c.categorySlug === null ? null : (FIESTA_DE_CATEGORIA[c.categorySlug] ?? null),
  categoria: c.categorySlug === null ? null : (nombreCategoria.get(c.categorySlug) ?? c.categorySlug),
  eventDate: c.eventDate,
  message: c.message,
  status: c.status,
  note: c.note,
  lostReason: c.lostReason,
  utm: c.utm,
  createdAt: c.createdAt,
  statusChangedAt: c.statusChangedAt,
  firstContactAt: c.firstContactAt,
  eventSlug: c.event?.slug ?? null,
})

export const aPedidoDeVenta = (o: Order): PedidoDeVenta => ({
  id: o.id,
  publicRef: o.publicRef,
  customerName: o.customerName,
  contact: o.contact,
  fiesta: o.templateSlug === null ? null : fiestaDeTema(o.templateSlug),
  eventDate: o.eventDate,
  status: o.status,
  origin: o.origin,
  amountCents: o.amountCents,
  depositCents: o.depositCents,
  balancePaidAt: o.balancePaidAt,
  remindedAt: o.remindedAt,
  producto: o.addonSlug === null ? (o.planName ?? 'Plan retirado') : `Extra · ${o.addonName ?? o.addonSlug}`,
  esExtra: o.addonSlug !== null,
  eventSlug: o.eventSlug,
  consultationId: o.consultationId,
  createdAt: o.createdAt,
  decidedAt: o.decidedAt,
})

/**
 * **Todas las ventas**, cada una una sola vez: las consultas y los pedidos leídos y unidos por
 * `componerVentas`. Lo usan Ventas, Hoy y Clientes, para que las tres digan lo mismo.
 */
export async function cargarVentas(ahora: Date): Promise<Result<{ ventas: Venta[]; consultas: ConsultaDeVenta[]; nombreCategoria: ReadonlyMap<string, string> }, string>> {
  const [consultas, pedidos, categorias] = await Promise.all([leads.list(null), orders.page({ status: null, tope: TOPE_DE_PEDIDOS, prioridad: ['proof_submitted'] }), catalog.listCategories('es')])
  if (isErr(consultas)) return err(consultas.error.detail)
  if (isErr(pedidos)) return err(pedidos.error.detail)
  const nombreCategoria = new Map(isErr(categorias) ? [] : categorias.value.map((c) => [c.slug, c.name]))
  const deVenta = consultas.value.filas.map((c) => aConsultaDeVenta(c, nombreCategoria))
  return ok({
    ventas: componerVentas({ consultas: deVenta, pedidos: pedidos.value.pedidos.map(({ order }) => aPedidoDeVenta(order)) }, ahora),
    consultas: deVenta,
    nombreCategoria,
  })
}

/**
 * **«Hoy», compuesto de las mismas lecturas que Ventas y Eventos**: las ventas de `cargarVentas`,
 * la salud de cada evento con `saludDelEvento` y los cambios de plan. Así Hoy no puede decir otra
 * cosa que el tablero o la cartera.
 */
export async function cargarHoy(ahora: Date) {
  const hoy = fechaEnBolivia(ahora)
  const [ventas, eventos, planesAdmin, extras, cambios] = await Promise.all([
    cargarVentas(ahora),
    admin.events(),
    admin.plans(),
    plans.listActiveExtras(),
    admin.planChanges(),
  ])
  if (isErr(ventas)) return err(ventas.error)
  if (isErr(eventos)) return err(eventos.error.detail)
  const plan = new Map(isErr(planesAdmin) ? [] : planesAdmin.value.map((p) => [p.slug, p]))
  const conSalud = eventos.value.map((e) => {
    const fiesta = fiestaDeTema(e.themeKey)
    const p = e.planSlug === null ? undefined : plan.get(e.planSlug)
    return {
      ...e,
      fiesta,
      salud: saludDelEvento({ ...e, fiesta }, hoy),
      maxGrupos: p?.maxGuestGroups ?? null,
      plannerSuite: p?.plannerSuite ?? null,
    }
  })
  // Las opiniones de los eventos del último mes: lo que llegó de la encuesta.
  const recientes = conSalud.filter((e) => e.eventDate < hoy && e.eventDate >= new Date(ahora.getTime() - 45 * 86_400_000).toISOString().slice(0, 10))
  const opiniones = await opinionesDe(recientes.map((e) => e.id))
  return ok({
    hoy,
    bandeja: componerHoy(
      {
        ventas: ventas.value.ventas,
        eventos: conSalud,
        cambiosDePlan: isErr(cambios) ? [] : cambios.value,
        extrasALaVenta: new Set(extras.map((x) => x.effect)),
        opiniones: recientes.flatMap((e) => {
          const o = opiniones.get(e.id)
          return o === undefined || o.rating === null || o.answeredAt === null ? [] : [{ slug: e.slug, title: e.title, rating: o.rating, comment: o.comment, allowPublish: o.allowPublish, answeredAt: o.answeredAt }]
        }),
      },
      hoy,
    ),
    ventas: ventas.value.ventas,
    eventos: conSalud,
  })
}

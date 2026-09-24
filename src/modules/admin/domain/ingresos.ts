import { fechaEnBolivia } from './hoy'

/**
 * Lo cobrado, compuesto sin base y con la fecha de Bolivia como argumento.
 *
 * Suma **el importe congelado del pedido**, nunca el precio actual del plan: desde que el
 * admin edita precios, leer el del plan reescribiría lo cobrado antes.
 */
export type PedidoCobro = {
  readonly ref: string
  readonly customerName: string
  readonly status: string
  readonly amountCents: number | null
  readonly currency: string | null
  readonly planName: string | null
  readonly decidedAt: Date | null
  readonly createdAt: Date
  readonly eventSlug: string | null
}

export type Ingresos = {
  readonly esteMes: number
  readonly esteAnio: number
  readonly aprobados: number
  /** `null` sin aprobados: un 0 diría que se vende gratis. */
  readonly ticketMedio: number | null
  readonly porRevisar: number
  readonly sinPago: number
  /** Pedidos aprobados sin importe —anteriores a la 0037 y sin plan—: no suman y se avisa. */
  readonly sinImporte: number
  readonly porMes: readonly { mes: string; total: number; pedidos: number }[]
  readonly porPlan: readonly { plan: string; total: number; pedidos: number }[]
  readonly ultimos: readonly PedidoCobro[]
}

const MESES = 12
const ULTIMOS = 10

/** `2026-09` → `2025-10`: los doce meses que acaban en el actual. */
function mesesHasta(hoy: string): string[] {
  const [anio, mes] = hoy.split('-').map(Number) as [number, number]
  return Array.from({ length: MESES }, (_, i) => {
    const d = new Date(Date.UTC(anio, mes - 1 - (MESES - 1 - i), 1))
    return d.toISOString().slice(0, 7)
  })
}

export function resumirIngresos(pedidos: readonly PedidoCobro[], hoy: string): Ingresos {
  const aprobados = pedidos.filter((p) => p.status === 'approved' && p.decidedAt !== null)
  const conImporte = aprobados.filter((p) => p.amountCents !== null)
  const dia = (p: PedidoCobro) => fechaEnBolivia(p.decidedAt as Date)
  const suma = (lista: readonly PedidoCobro[]) => lista.reduce((total, p) => total + (p.amountCents ?? 0), 0)

  const mesActual = hoy.slice(0, 7)
  const anioActual = hoy.slice(0, 4)

  const porMes = mesesHasta(hoy).map((mes) => {
    const delMes = conImporte.filter((p) => dia(p).startsWith(mes))
    return { mes, total: suma(delMes), pedidos: delMes.length }
  })

  const planes = new Map<string, { total: number; pedidos: number }>()
  for (const p of conImporte) {
    const clave = p.planName ?? 'Sin plan'
    const actual = planes.get(clave) ?? { total: 0, pedidos: 0 }
    planes.set(clave, { total: actual.total + (p.amountCents ?? 0), pedidos: actual.pedidos + 1 })
  }

  return {
    esteMes: suma(conImporte.filter((p) => dia(p).startsWith(mesActual))),
    esteAnio: suma(conImporte.filter((p) => dia(p).startsWith(anioActual))),
    aprobados: aprobados.length,
    ticketMedio: conImporte.length === 0 ? null : Math.round(suma(conImporte) / conImporte.length),
    porRevisar: suma(pedidos.filter((p) => p.status === 'proof_submitted')),
    sinPago: suma(pedidos.filter((p) => p.status === 'pending_payment')),
    sinImporte: aprobados.length - conImporte.length,
    porMes,
    porPlan: [...planes.entries()].map(([plan, v]) => ({ plan, ...v })).sort((a, b) => b.total - a.total),
    ultimos: [...conImporte].sort((a, b) => (b.decidedAt as Date).getTime() - (a.decidedAt as Date).getTime()).slice(0, ULTIMOS),
  }
}

/** Lo que entró por cada puerta en los últimos doce meses, contado en la base. */
export type ConteoDeVenta = {
  readonly consultas: number
  readonly consultasGanadas: number
  readonly pedidos: number
  readonly pagados: number
  readonly conEvento: number
}

export type PasoDelEmbudo = {
  readonly clave: 'consultas' | 'pedidos' | 'pagados' | 'eventos'
  readonly titulo: string
  readonly total: number
  /** Qué parte del paso anterior llegó a este. `null` en el primero o si el anterior es 0. */
  readonly desdeElAnterior: number | null
}

export type Embudo = {
  readonly pasos: readonly PasoDelEmbudo[]
  /** Consultas ganadas sobre las recibidas; `null` sin consultas. Es la tasa de cierre del formulario. */
  readonly cierreDeConsultas: number | null
}

const tasa = (parte: number, total: number): number | null => (total === 0 ? null : Math.round((parte / total) * 100))

/**
 * El recorrido de la venta. Consultas y pedidos entran por puertas distintas —el formulario de
 * contacto y el botón «Pedir» de la web—, así que el paso de consultas a pedidos es orientativo;
 * de pedido a pagado y de pagado a evento sí es el mismo pedido.
 */
export function embudoDeVentas(c: ConteoDeVenta): Embudo {
  const pasos: PasoDelEmbudo[] = [
    { clave: 'consultas', titulo: 'Consultas', total: c.consultas, desdeElAnterior: null },
    { clave: 'pedidos', titulo: 'Pedidos', total: c.pedidos, desdeElAnterior: tasa(c.pedidos, c.consultas) },
    { clave: 'pagados', titulo: 'Pagados', total: c.pagados, desdeElAnterior: tasa(c.pagados, c.pedidos) },
    { clave: 'eventos', titulo: 'Con su evento', total: c.conEvento, desdeElAnterior: tasa(c.conEvento, c.pagados) },
  ]
  return { pasos, cierreDeConsultas: tasa(c.consultasGanadas, c.consultas) }
}

/** Las cifras de dinero de «Hoy», sumadas en la base: la portada no lee todos los pedidos. */
export type CifrasDeHoy = {
  /** Aprobado en el mes en curso de Bolivia, con el importe congelado. */
  readonly esteMes: number
  readonly porRevisar: number
  readonly sinPago: number
}

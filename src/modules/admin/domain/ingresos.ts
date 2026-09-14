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

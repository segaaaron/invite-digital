import { origenDe, type FiestaDeVenta, type Venta } from './ventas'

/**
 * **Lo que las ventas dicen del negocio**, para Ingresos: cuánto deja cada fiesta, lo que queda
 * por cobrar, qué meses se venden más (las temporadas), por qué se pierde y de dónde llega quien
 * compra. Puro, sobre las mismas ventas que el tablero.
 */
const COBRADAS = new Set<Venta['etapa']>(['cerrada', 'saldo_pendiente', 'por_crear_evento'])
const MESES_DEL_ANIO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export type Analisis = {
  readonly porFiesta: readonly { fiesta: FiestaDeVenta; total: number; ventas: number }[]
  /** Lo que falta cobrar: pedidos esperando pago o comprobante y saldos de anticipos. */
  readonly porCobrar: { readonly total: number; readonly esperando: number; readonly saldos: number }
  /** Lo vendido por mes **del evento**, los seis que vienen: el dinero que llega con cada temporada. */
  readonly porMesDelEvento: readonly { mes: string; cobrado: number; abierto: number }[]
  /** Los dos meses del año en que más se compra cada fiesta, con al menos tres ventas. */
  readonly temporadas: readonly { fiesta: Exclude<FiestaDeVenta, null>; meses: readonly string[]; ventas: number }[]
  readonly motivosDePerdida: readonly { motivo: string; veces: number }[]
  /** De dónde llega quien escribe, y cuántos de esos compran. */
  readonly origenes: readonly { origen: string; consultas: number; ganadas: number }[]
}

const saldoDe = (v: Venta) =>
  v.etapa === 'saldo_pendiente' && v.pedido?.amountCents != null && v.pedido.depositCents != null ? v.pedido.amountCents - v.pedido.depositCents : 0

/** `nombreDeMotivo` traduce la clave del motivo de pérdida; vive en `leads` y este dominio no lo importa. */
export function analizarVentas(ventas: readonly Venta[], hoy: string, nombreDeMotivo: (clave: string | null) => string | null): Analisis {
  const cobradas = ventas.filter((v) => COBRADAS.has(v.etapa))

  const fiestas = new Map<FiestaDeVenta, { total: number; ventas: number }>()
  for (const v of cobradas) {
    const a = fiestas.get(v.fiesta) ?? { total: 0, ventas: 0 }
    fiestas.set(v.fiesta, { total: a.total + (v.importeCents ?? 0), ventas: a.ventas + 1 })
  }

  const esperando = ventas.filter((v) => v.etapa === 'esperando_pago' || v.etapa === 'por_revisar').reduce((s, v) => s + (v.importeCents ?? 0), 0)
  const saldos = ventas.reduce((s, v) => s + saldoDe(v), 0)

  const [anio, mes] = hoy.split('-').map(Number) as [number, number]
  const porMesDelEvento = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(anio, mes - 1 + i, 1)).toISOString().slice(0, 7)).map((m) => ({
    mes: m,
    cobrado: cobradas.filter((v) => v.fechaEvento?.startsWith(m)).reduce((s, v) => s + (v.importeCents ?? 0), 0),
    abierto: ventas.filter((v) => (v.etapa === 'esperando_pago' || v.etapa === 'por_revisar') && v.fechaEvento?.startsWith(m)).reduce((s, v) => s + (v.importeCents ?? 0), 0),
  }))

  // Las temporadas: en qué mes del año se **compra** (fecha del pedido), por fiesta.
  const temporadas = (['boda', 'xv', 'cumple'] as const).flatMap((fiesta) => {
    const compras = ventas.filter((v) => v.fiesta === fiesta && v.pedido !== null && COBRADAS.has(v.etapa))
    if (compras.length < 3) return []
    const porMes = new Map<number, number>()
    for (const v of compras) {
      const m = (v.pedido as NonNullable<Venta['pedido']>).createdAt.getUTCMonth()
      porMes.set(m, (porMes.get(m) ?? 0) + 1)
    }
    const top = [...porMes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => MESES_DEL_ANIO[m] as string)
    return [{ fiesta, meses: top, ventas: compras.length }]
  })

  const motivos = new Map<string, number>()
  for (const v of ventas) {
    if (v.etapa !== 'perdida' && v.etapa !== 'cancelada') continue
    const motivo = v.etapa === 'perdida' ? (nombreDeMotivo(v.consulta?.lostReason ?? null) ?? 'Sin motivo') : 'Pedido cancelado'
    motivos.set(motivo, (motivos.get(motivo) ?? 0) + 1)
  }

  const origenes = new Map<string, { consultas: number; ganadas: number }>()
  for (const v of ventas) {
    if (v.consulta === null) continue
    const o = origenDe(v.consulta.utm)
    const a = origenes.get(o) ?? { consultas: 0, ganadas: 0 }
    origenes.set(o, { consultas: a.consultas + 1, ganadas: a.ganadas + (COBRADAS.has(v.etapa) ? 1 : 0) })
  }

  return {
    porFiesta: [...fiestas.entries()].map(([fiesta, a]) => ({ fiesta, ...a })).sort((a, b) => b.total - a.total),
    porCobrar: { total: esperando + saldos, esperando, saldos },
    porMesDelEvento,
    temporadas,
    motivosDePerdida: [...motivos.entries()].map(([motivo, veces]) => ({ motivo, veces })).sort((a, b) => b.veces - a.veces),
    origenes: [...origenes.entries()].map(([origen, a]) => ({ origen, ...a })).sort((a, b) => b.consultas - a.consultas),
  }
}

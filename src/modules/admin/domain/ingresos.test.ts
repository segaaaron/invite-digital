import { describe, expect, it } from 'vitest'
import { embudoDeVentas, resumirIngresos, type PedidoCobro } from './ingresos'

const HOY = '2026-09-14'

const pedido = (over: Partial<PedidoCobro>): PedidoCobro => ({
  ref: 'R1',
  customerName: 'Ana',
  status: 'approved',
  amountCents: 69000,
  currency: 'BOB',
  planName: 'Atelier',
  decidedAt: new Date('2026-09-10T15:00:00Z'),
  createdAt: new Date('2026-09-01T15:00:00Z'),
  eventSlug: null,
  ...over,
})

describe('resumirIngresos', () => {
  it('cobrado es solo lo aprobado, por fecha de aprobación en Bolivia', () => {
    const r = resumirIngresos(
      [
        pedido({ ref: 'A' }),
        pedido({ ref: 'B', status: 'rejected' }),
        // Aprobado a las 23:30 de La Paz del 31 de agosto: en UTC ya es septiembre.
        pedido({ ref: 'C', amountCents: 145000, decidedAt: new Date('2026-09-01T03:30:00Z') }),
      ],
      HOY,
    )
    expect(r.esteMes).toBe(69000)
    expect(r.esteAnio).toBe(214000)
    expect(r.aprobados).toBe(2)
    expect(r.ticketMedio).toBe(107000)
  })

  it('por cobrar: comprobante subido y pedido abierto van aparte', () => {
    const r = resumirIngresos(
      [pedido({ status: 'proof_submitted', decidedAt: null }), pedido({ status: 'pending_payment', decidedAt: null, amountCents: 1000 })],
      HOY,
    )
    expect(r.porRevisar).toBe(69000)
    expect(r.sinPago).toBe(1000)
    expect(r.esteMes).toBe(0)
    expect(r.ticketMedio).toBe(null)
  })

  it('doce meses hacia atrás con los huecos a cero, el actual el último', () => {
    const r = resumirIngresos([pedido({ decidedAt: new Date('2025-10-05T15:00:00Z') })], HOY)
    expect(r.porMes).toHaveLength(12)
    expect(r.porMes[0]).toEqual({ mes: '2025-10', total: 69000, pedidos: 1 })
    expect(r.porMes[11]).toEqual({ mes: '2026-09', total: 0, pedidos: 0 })
  })

  it('por plan, de más a menos cobrado; sin plan se nombra', () => {
    const r = resumirIngresos(
      [pedido({ planName: 'Atelier' }), pedido({ planName: null, amountCents: 290000 }), pedido({ planName: 'Atelier' })],
      HOY,
    )
    expect(r.porPlan).toEqual([
      { plan: 'Sin plan', total: 290000, pedidos: 1 },
      { plan: 'Atelier', total: 138000, pedidos: 2 },
    ])
  })

  it('un pedido sin importe no suma, pero se cuenta para avisar', () => {
    const r = resumirIngresos([pedido({ amountCents: null })], HOY)
    expect(r.esteMes).toBe(0)
    expect(r.sinImporte).toBe(1)
  })

  it('los últimos cobros, el más reciente primero, hasta diez', () => {
    const muchos = Array.from({ length: 12 }, (_, i) => pedido({ ref: `R${i}`, decidedAt: new Date(Date.UTC(2026, 8, 1 + i, 15)) }))
    const r = resumirIngresos(muchos, HOY)
    expect(r.ultimos).toHaveLength(10)
    expect(r.ultimos[0]?.ref).toBe('R11')
  })
})

describe('embudoDeVentas', () => {
  it('cuenta cada paso y qué parte llegó desde el anterior', () => {
    const e = embudoDeVentas({ consultas: 40, consultasGanadas: 10, pedidos: 20, pagados: 15, conEvento: 12 })
    expect(e.pasos.map((p) => [p.clave, p.total, p.desdeElAnterior])).toEqual([
      ['consultas', 40, null],
      ['pedidos', 20, 50],
      ['pagados', 15, 75],
      ['eventos', 12, 80],
    ])
    expect(e.cierreDeConsultas).toBe(25)
  })

  it('sin nada que dividir no inventa un 0 %', () => {
    const e = embudoDeVentas({ consultas: 0, consultasGanadas: 0, pedidos: 3, pagados: 0, conEvento: 0 })
    expect(e.pasos.map((p) => p.desdeElAnterior)).toEqual([null, null, 0, null])
    expect(e.cierreDeConsultas).toBeNull()
  })
})

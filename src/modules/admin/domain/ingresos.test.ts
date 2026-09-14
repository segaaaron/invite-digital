import { describe, expect, it } from 'vitest'
import { resumirIngresos, type PedidoCobro } from './ingresos'

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

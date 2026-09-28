import { describe, expect, it } from 'vitest'
import { analizarVentas } from './analisis'
import type { Venta } from './ventas'

const venta = (parcial: Partial<Venta> & Pick<Venta, 'etapa'>): Venta => ({
  clave: `v${Math.random()}`,
  nombre: 'X',
  correo: null,
  telefono: null,
  fiesta: 'boda',
  fechaEvento: '2026-11-14',
  consulta: null,
  pedido: null,
  importeCents: 100_000,
  esperaDesde: new Date(),
  urgente: false,
  ...parcial,
})
const pedido = (mes: number, parcial: Partial<NonNullable<Venta['pedido']>> = {}): NonNullable<Venta['pedido']> => ({
  id: 'p',
  publicRef: 'R',
  customerName: 'X',
  contact: 'x@y.bo',
  fiesta: 'xv',
  eventDate: null,
  status: 'approved',
  origin: 'web',
  amountCents: 100_000,
  depositCents: null,
  balancePaidAt: null,
  remindedAt: null,
  producto: 'Firma 3D',
  esExtra: false,
  eventSlug: 's',
  consultationId: null,
  createdAt: new Date(Date.UTC(2026, mes, 3)),
  decidedAt: null,
  ...parcial,
})

describe('analizarVentas', () => {
  it('reparte lo cobrado por fiesta y suma lo que falta cobrar, saldos incluidos', () => {
    const a = analizarVentas(
      [
        venta({ etapa: 'cerrada', fiesta: 'xv' }),
        venta({ etapa: 'cerrada', fiesta: 'boda', importeCents: 200_000 }),
        venta({ etapa: 'esperando_pago', importeCents: 50_000 }),
        venta({ etapa: 'saldo_pendiente', pedido: pedido(8, { amountCents: 100_000, depositCents: 40_000 }) }),
      ],
      '2026-09-28',
      () => null,
    )
    expect(a.porFiesta.map((f) => [f.fiesta, f.total])).toEqual([
      ['boda', 300_000],
      ['xv', 100_000],
    ])
    expect(a.porCobrar).toEqual({ total: 110_000, esperando: 50_000, saldos: 60_000 })
    expect(a.porMesDelEvento.find((m) => m.mes === '2026-11')).toEqual({ mes: '2026-11', cobrado: 400_000, abierto: 50_000 })
  })

  it('dice las temporadas con tres ventas o más, y por qué se pierde', () => {
    const xv = [8, 8, 9, 2].map((m) => venta({ etapa: 'cerrada', fiesta: 'xv', pedido: pedido(m) }))
    const perdida = venta({ etapa: 'perdida', consulta: { id: 'c', name: 'X', email: null, phone: null, fiesta: 'boda', categoria: null, eventDate: null, message: null, status: 'lost', note: null, lostReason: 'precio', utm: null, createdAt: new Date(), statusChangedAt: null, firstContactAt: null, eventSlug: null } })
    const a = analizarVentas([...xv, perdida], '2026-09-28', (m) => (m === 'precio' ? 'Le pareció caro' : null))
    expect(a.temporadas).toEqual([{ fiesta: 'xv', meses: ['septiembre', 'octubre'], ventas: 4 }])
    expect(a.motivosDePerdida).toEqual([{ motivo: 'Le pareció caro', veces: 1 }])
    expect(a.origenes).toEqual([{ origen: 'Directo', consultas: 1, ganadas: 0 }])
  })
})

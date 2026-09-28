import { describe, expect, it } from 'vitest'
import { componerVentas, contarPorEtapa, filtrarVentas, origenDe, primeraRespuestaMedia, siguientePaso, ventaDeClave, type ConsultaDeVenta, type PedidoDeVenta } from './ventas'

const AHORA = new Date('2026-09-28T15:00:00Z')
const horasAntes = (h: number) => new Date(AHORA.getTime() - h * 3_600_000)

const consulta = (parcial: Partial<ConsultaDeVenta> & { id: string }): ConsultaDeVenta => ({
  name: 'Carla Mendoza',
  email: null,
  phone: null,
  fiesta: 'boda',
  categoria: 'Boda',
  eventDate: '2027-02-14',
  message: null,
  status: 'new',
  note: null,
  lostReason: null,
  utm: null,
  createdAt: horasAntes(3),
  statusChangedAt: null,
  firstContactAt: null,
  eventSlug: null,
  ...parcial,
})

const pedido = (parcial: Partial<PedidoDeVenta> & { publicRef: string }): PedidoDeVenta => ({
  id: `id-${parcial.publicRef}`,
  customerName: 'Carla Mendoza',
  contact: 'carla@x.bo',
  fiesta: null,
  eventDate: '2027-02-14',
  status: 'pending_payment',
  origin: 'web',
  amountCents: 119_000,
  depositCents: null,
  balancePaidAt: null,
  remindedAt: null,
  producto: 'Firma 3D',
  esExtra: false,
  eventSlug: null,
  consultationId: null,
  createdAt: horasAntes(2),
  decidedAt: null,
  ...parcial,
})

describe('componerVentas', () => {
  it('la consulta y su pedido son UNA venta, y manda el pedido', () => {
    const ventas = componerVentas(
      { consultas: [consulta({ id: 'c1', email: 'CARLA@x.bo', status: 'contacted' })], pedidos: [pedido({ publicRef: 'AAAA2222' })] },
      AHORA,
    )
    expect(ventas).toHaveLength(1)
    expect(ventas[0]).toMatchObject({ clave: 'p-AAAA2222', etapa: 'esperando_pago', fiesta: 'boda', importeCents: 119_000 })
    expect(ventas[0]?.consulta?.id).toBe('c1')
  })

  it('une por teléfono (últimos 8 dígitos) y por enlace explícito, sin repetir consultas', () => {
    const ventas = componerVentas(
      {
        consultas: [consulta({ id: 'c1', phone: '+591 700-00001' }), consulta({ id: 'c2', name: 'Otra', email: 'otra@x.bo' })],
        pedidos: [pedido({ publicRef: 'BBBB3333', contact: '70000001' }), pedido({ publicRef: 'CCCC4444', contact: 'x@y.bo', consultationId: 'c2', origin: 'cotizacion' })],
      },
      AHORA,
    )
    expect(ventas.map((v) => [v.clave, v.consulta?.id ?? null]).sort()).toEqual([
      ['p-BBBB3333', 'c1'],
      ['p-CCCC4444', 'c2'],
    ])
  })

  it('una consulta perdida no se une a un pedido nuevo de la misma persona', () => {
    const ventas = componerVentas({ consultas: [consulta({ id: 'c1', email: 'a@b.bo', status: 'lost' })], pedidos: [pedido({ publicRef: 'DDDD5555', contact: 'a@b.bo' })] }, AHORA)
    expect(ventas).toHaveLength(2)
  })

  it('deriva la etapa de lo que ya se guarda', () => {
    const etapa = (p: Partial<PedidoDeVenta>) => componerVentas({ consultas: [], pedidos: [pedido({ publicRef: 'EEEE6666', ...p })] }, AHORA)[0]?.etapa
    expect(etapa({ status: 'proof_submitted' })).toBe('por_revisar')
    expect(etapa({ status: 'rejected' })).toBe('esperando_pago')
    expect(etapa({ status: 'approved', decidedAt: AHORA })).toBe('por_crear_evento')
    expect(etapa({ status: 'approved', eventSlug: 'boda-x', depositCents: 50_000 })).toBe('saldo_pendiente')
    expect(etapa({ status: 'approved', eventSlug: 'boda-x', depositCents: 50_000, balancePaidAt: AHORA })).toBe('cerrada')
    expect(etapa({ status: 'approved', esExtra: true })).toBe('cerrada')
    expect(etapa({ status: 'cancelled' })).toBe('cancelada')
  })

  it('lo urgente sube: consulta sin contestar un día, comprobante medio día, pedido pagado sin evento', () => {
    const ventas = componerVentas(
      {
        consultas: [consulta({ id: 'fresca', createdAt: horasAntes(2) }), consulta({ id: 'vieja', name: 'Vieja', createdAt: horasAntes(30) })],
        pedidos: [pedido({ publicRef: 'FFFF7777', contact: 'z@z.bo', status: 'proof_submitted', createdAt: horasAntes(13) })],
      },
      AHORA,
    )
    expect(ventas.filter((v) => v.urgente).map((v) => v.clave).sort()).toEqual(['c-vieja', 'p-FFFF7777'])
    expect(ventas[ventas.length - 1]?.clave).toBe('c-fresca')
  })
})

describe('buscar, contar y decidir el siguiente paso', () => {
  const ventas = componerVentas(
    {
      consultas: [consulta({ id: 'c1', name: 'Familia Vargas', phone: '+59170000002', fiesta: 'xv' }), consulta({ id: 'c2', name: 'Jorge Paz', status: 'lost', lostReason: 'precio' })],
      pedidos: [pedido({ publicRef: 'GGGG8888', customerName: 'Pedro y Ana', contact: 'pedro@x.bo', status: 'approved', decidedAt: AHORA })],
    },
    AHORA,
  )

  it('filtra por etapa, fiesta y texto, con «abiertas» sin lo cerrado ni lo perdido', () => {
    expect(filtrarVentas(ventas, { etapa: 'abiertas', fiesta: 'todas', q: '' }).map((v) => v.nombre).sort()).toEqual(['Familia Vargas', 'Pedro y Ana'])
    expect(filtrarVentas(ventas, { etapa: 'todas', fiesta: 'xv', q: '' }).map((v) => v.nombre)).toEqual(['Familia Vargas'])
    expect(filtrarVentas(ventas, { etapa: 'todas', fiesta: 'todas', q: '7000 0002' }).map((v) => v.nombre)).toEqual(['Familia Vargas'])
    expect(filtrarVentas(ventas, { etapa: 'todas', fiesta: 'todas', q: 'gggg' }).map((v) => v.nombre)).toEqual(['Pedro y Ana'])
    expect(contarPorEtapa(ventas)).toMatchObject({ nueva: 1, perdida: 1, por_crear_evento: 1, cerrada: 0 })
  })

  it('el botón principal es el siguiente paso de su etapa', () => {
    expect(ventas.map((v) => [v.nombre, siguientePaso(v)]).sort()).toEqual([
      ['Familia Vargas', 'Contactar'],
      ['Jorge Paz', 'Reabrir'],
      ['Pedro y Ana', 'Crear el evento'],
    ])
  })

  it('abre por la clave nueva y por las viejas ?pedido= y ?consulta=', () => {
    expect(ventaDeClave(ventas, { venta: 'c-c1' })?.nombre).toBe('Familia Vargas')
    expect(ventaDeClave(ventas, { pedido: 'GGGG8888' })?.nombre).toBe('Pedro y Ana')
    expect(ventaDeClave(ventas, { consulta: 'c2' })?.nombre).toBe('Jorge Paz')
  })
})

describe('cifras de la venta', () => {
  it('primera respuesta media en horas, sin contar las no contestadas', () => {
    expect(primeraRespuestaMedia([{ createdAt: horasAntes(10), firstContactAt: horasAntes(8) }, { createdAt: horasAntes(5), firstContactAt: horasAntes(4) }, { createdAt: horasAntes(1), firstContactAt: null }])).toBe(1.5)
    expect(primeraRespuestaMedia([])).toBeNull()
  })

  it('el origen se lee de la utm, y sin ella es directo', () => {
    expect(origenDe({ utm_source: 'ig' })).toBe('Instagram')
    expect(origenDe({ utm_source: 'google' })).toBe('Google')
    expect(origenDe(null)).toBe('Directo')
    expect(origenDe({ utm_source: 'feria' })).toBe('Feria')
  })
})

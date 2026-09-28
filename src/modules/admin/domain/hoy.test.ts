import { describe, expect, it } from 'vitest'
import { componerHoy, diasEntre, fechaEnBolivia, type EventoDeHoy } from './hoy'
import { componerVentas, type ConsultaDeVenta, type PedidoDeVenta } from './ventas'

const HOY = '2026-09-14'
const AHORA = new Date('2026-09-14T15:00:00Z')
const horasAntes = (h: number) => new Date(AHORA.getTime() - h * 3_600_000)

const consulta = (id: string, horas: number): ConsultaDeVenta => ({
  id,
  name: `Consulta ${id}`,
  email: `${id}@x.bo`,
  phone: null,
  fiesta: 'boda',
  categoria: 'Boda',
  eventDate: '2027-02-14',
  message: null,
  status: 'new',
  note: null,
  lostReason: null,
  utm: null,
  createdAt: horasAntes(horas),
  statusChangedAt: null,
  firstContactAt: null,
  eventSlug: null,
})

const pedido = (ref: string, parcial: Partial<PedidoDeVenta>): PedidoDeVenta => ({
  id: ref,
  publicRef: ref,
  customerName: `Pedido ${ref}`,
  contact: `${ref}@y.bo`,
  fiesta: 'xv',
  eventDate: '2026-12-05',
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

const evento = (parcial: Partial<EventoDeHoy>): EventoDeHoy => ({
  slug: 'boda-x',
  title: 'Boda X',
  eventDate: '2026-10-20',
  salud: { tono: 'ok', texto: 'Al día', alertas: [] },
  grupos: 10,
  maxGrupos: 40,
  plannerSuite: 'esencial',
  ...parcial,
})

const nada = { ventas: [], eventos: [], cambiosDePlan: [], extrasALaVenta: new Set<string>() }

describe('fechas de «Hoy»', () => {
  it('cuenta días de calendario, no instantes', () => {
    expect(diasEntre('2026-09-14', '2026-09-14')).toBe(0)
    expect(diasEntre('2026-09-14', '2026-10-14')).toBe(30)
    expect(diasEntre('2026-09-14', '2026-09-10')).toBe(-4)
  })

  it('el día es el de Bolivia: a las 23:30 de La Paz en UTC ya es mañana', () => {
    expect(fechaEnBolivia(new Date('2026-09-15T03:30:00Z'))).toBe('2026-09-14')
  })
})

describe('componerHoy', () => {
  it('sin nada que hacer, ningún grupo', () => {
    expect(componerHoy(nada, HOY)).toEqual({ grupos: [], total: 0 })
  })

  it('las ventas salen de las mismas ventas que el tablero: lo pagado primero, luego comprobantes y consultas', () => {
    const ventas = componerVentas(
      {
        consultas: [consulta('a', 5)],
        pedidos: [pedido('PAGADO22', { status: 'approved', decidedAt: horasAntes(1) }), pedido('REVISA33', { status: 'proof_submitted' })],
      },
      AHORA,
    )
    const hoy = componerHoy({ ...nada, ventas }, HOY)
    expect(hoy.grupos[0]?.avisos.map((a) => [a.etiqueta, a.href])).toEqual([
      ['Pagado', '/panel/admin/ventas?venta=p-PAGADO22'],
      ['Comprobante', '/panel/admin/ventas?venta=p-REVISA33'],
      ['Consulta', '/panel/admin/ventas?venta=c-a'],
    ])
    expect(hoy.total).toBe(3)
  })

  it('más de cuatro de una etapa se resumen en uno que abre su lista', () => {
    const ventas = componerVentas({ consultas: ['a', 'b', 'c', 'd', 'e'].map((id, i) => consulta(id, i + 1)), pedidos: [] }, AHORA)
    const [aviso] = componerHoy({ ...nada, ventas }, HOY).grupos[0]?.avisos ?? []
    expect(aviso).toMatchObject({ titulo: '5 consultas sin contestar', href: '/panel/admin/ventas?vista=lista&etapa=nueva' })
  })

  it('los eventos en riesgo salen de su salud, en los próximos 90 días', () => {
    const hoy = componerHoy(
      {
        ...nada,
        eventos: [
          evento({ slug: 'cerca', salud: { tono: 'risk', texto: 'Invitación sin escribir · faltan 36 días', alertas: [{ clave: 'x', tono: 'risk', texto: '' }] } }),
          evento({ slug: 'lejos', eventDate: '2027-06-01', salud: { tono: 'risk', texto: 'x', alertas: [] } }),
        ],
      },
      HOY,
    )
    expect(hoy.grupos.map((g) => g.id)).toEqual(['riesgos'])
    expect(hoy.grupos[0]?.avisos.map((a) => a.clave)).toEqual(['riesgo:cerca'])
  })

  it('las oportunidades solo ofrecen lo que se vende y no suman a lo que espera', () => {
    const conDiaD = evento({ slug: 'xv', eventDate: '2026-10-20', plannerSuite: 'completo' })
    expect(componerHoy({ ...nada, eventos: [conDiaD] }, HOY).grupos).toEqual([])
    const hoy = componerHoy({ ...nada, eventos: [conDiaD, evento({ slug: 'fue', eventDate: '2026-09-11' })], extrasALaVenta: new Set(['dia_d']) }, HOY)
    expect(hoy.grupos[0]?.avisos.map((a) => a.clave)).toEqual(['op-diad:xv', 'op-gracias:fue'])
    expect(hoy.total).toBe(0)
  })

  it('una opinión que se puede publicar lleva a la ficha de su cliente; la que no, al evento', () => {
    const opinion = (slug: string, allowPublish: boolean) => ({ slug, title: slug, rating: 5, comment: 'Hermosa', allowPublish, answeredAt: horasAntes(5) })
    const hoy = componerHoy({ ...nada, opiniones: [opinion('con-permiso', true), opinion('sin-permiso', false)] }, HOY)
    const avisos = hoy.grupos.find((g) => g.id === 'opiniones')?.avisos ?? []
    expect(avisos.map((a) => [a.href, a.accion])).toEqual(
      expect.arrayContaining([
        ['/panel/admin/clientes?evento=con-permiso', 'Publicar'],
        ['/panel/admin/eventos?evento=sin-permiso', 'Ver'],
      ]),
    )
  })
})

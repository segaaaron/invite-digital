import { describe, expect, it } from 'vitest'
import { componerHoy, diasEntre, fechaEnBolivia, type HoyCrudo } from './hoy'

const HOY = '2026-09-14'

const vacio: HoyCrudo = {
  pedidosPorRevisar: [],
  pedidosSinPago: [],
  consultasNuevas: [],
  cambiosDePlan: [],
  eventos: [],
  accesosSinEstrenar: [],
}

const evento = (over: Partial<HoyCrudo['eventos'][number]>): HoyCrudo['eventos'][number] => ({
  slug: 'boda-x',
  title: 'Boda X',
  eventDate: '2026-09-20',
  status: 'live',
  grupos: 10,
  respondidos: 4,
  ...over,
})

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
  it('sin nada pendiente no hay avisos', () => {
    const hoy = componerHoy(vacio, HOY)
    expect(hoy.total).toBe(0)
    expect(hoy.ventas).toEqual([])
  })

  it('las ventas: comprobantes, cambios de plan y consultas, en ese orden y lo más antiguo primero dentro de cada uno', () => {
    const hoy = componerHoy(
      {
        ...vacio,
        pedidosPorRevisar: [
          { ref: 'B', customerName: 'Beto', createdAt: new Date('2026-09-13T15:00:00Z') },
          { ref: 'A', customerName: 'Ana', createdAt: new Date('2026-09-10T15:00:00Z') },
        ],
        consultasNuevas: [{ id: 'c1', name: 'María', createdAt: new Date('2026-09-12T15:00:00Z'), eventDate: null }],
        cambiosDePlan: [{ eventSlug: 'boda-x', eventTitle: 'Boda X', planSlug: 'alta-costura', createdAt: new Date('2026-09-11T15:00:00Z') }],
      },
      HOY,
    )
    expect(hoy.ventas.map((a) => a.titulo)).toEqual(['Ana', 'Beto', 'Boda X', 'María'])
    expect(hoy.ventas[0]?.href).toBe('/panel/admin/ventas?pedido=A')
    expect(hoy.totales).toMatchObject({ pedidos: 2, consultas: 1, cambios: 1 })
  })

  it('más de tres consultas se resumen en un aviso que lleva a la bandeja', () => {
    const consultas = Array.from({ length: 4 }, (_, i) => ({
      id: `c${i}`,
      name: `Persona ${i}`,
      createdAt: new Date(`2026-09-1${i}T15:00:00Z`),
      eventDate: null,
    }))
    const hoy = componerHoy({ ...vacio, consultasNuevas: consultas }, HOY)
    expect(hoy.ventas).toHaveLength(1)
    expect(hoy.ventas[0]).toMatchObject({ clave: 'consultas', titulo: '4 consultas sin contactar', detalle: 'La más antigua escribió hace 4 días' })
    expect(hoy.totales.consultas).toBe(4)
    // El total cuenta la cosa que hacer, no las cuatro filas.
    expect(hoy.total).toBe(1)
  })

  it('en riesgo: borrador a 30 días o menos, y más urgente a 7', () => {
    const hoy = componerHoy(
      {
        ...vacio,
        eventos: [
          evento({ slug: 'lejos', eventDate: '2026-10-14', status: 'draft' }),
          evento({ slug: 'cerca', eventDate: '2026-09-18', status: 'draft' }),
          evento({ slug: 'fuera', eventDate: '2026-10-15', status: 'draft' }),
        ],
      },
      HOY,
    )
    expect(hoy.riesgos.map((a) => [a.clave, a.tono])).toEqual([
      ['borrador:cerca', 'no'],
      ['borrador:lejos', 'maybe'],
    ])
  })

  it('en riesgo: publicada sin grupos; una cerrada o con grupos no', () => {
    const hoy = componerHoy(
      {
        ...vacio,
        eventos: [
          evento({ slug: 'vacia', grupos: 0, respondidos: 0 }),
          evento({ slug: 'cerrada', status: 'closed', grupos: 0, respondidos: 0 }),
          evento({ slug: 'llena' }),
        ],
      },
      HOY,
    )
    expect(hoy.riesgos.map((a) => a.clave)).toEqual(['sin-invitados:vacia'])
    expect(hoy.riesgos[0]?.href).toBe('/panel/eventos/vacia/configuracion')
  })

  it('atascados: acceso sin estrenar a los 3 días, no antes', () => {
    const hoy = componerHoy(
      {
        ...vacio,
        accesosSinEstrenar: [
          { email: 'nuevo@x.bo', createdAt: new Date('2026-09-12T15:00:00Z'), eventSlug: 'boda-x', eventTitle: 'Boda X' },
          { email: 'viejo@x.bo', createdAt: new Date('2026-09-10T15:00:00Z'), eventSlug: null, eventTitle: null },
        ],
      },
      HOY,
    )
    expect(hoy.atascados.map((a) => a.titulo)).toEqual(['viejo@x.bo'])
    expect(hoy.atascados[0]?.href).toBe('/panel/admin/usuarios')
  })

  it('muchos comprobantes se resumen en un aviso que abre la bandeja filtrada: «Hoy» no pinta setecientas filas', () => {
    const pedidosPorRevisar = Array.from({ length: 6 }, (_, i) => ({ ref: `R${i}`, customerName: `Cliente ${i}`, createdAt: new Date(`2026-09-0${i + 1}T15:00:00Z`) }))
    const hoy = componerHoy({ ...vacio, pedidosPorRevisar }, HOY)
    expect(hoy.ventas).toEqual([
      expect.objectContaining({ clave: 'comprobantes', titulo: '6 comprobantes por revisar', detalle: 'El más antiguo espera desde hace 13 días', href: '/panel/pedidos?estado=proof_submitted' }),
    ])
    expect(hoy.totales.pedidos).toBe(6)
    // Hasta cinco van sueltos: cada uno es alguien que ya pagó.
    expect(componerHoy({ ...vacio, pedidosPorRevisar: pedidosPorRevisar.slice(0, 5) }, HOY).ventas).toHaveLength(5)
  })

  it('muchos pedidos sin pago se resumen en un aviso que abre la bandeja filtrada', () => {
    const pedidosSinPago = Array.from({ length: 4 }, (_, i) => ({ ref: `S${i}`, customerName: `Sin pago ${i}`, createdAt: new Date(`2026-08-0${i + 1}T15:00:00Z`) }))
    const hoy = componerHoy({ ...vacio, pedidosSinPago }, HOY)
    expect(hoy.atascados).toEqual([
      expect.objectContaining({ clave: 'sin-pago', titulo: '4 pedidos sin pago', href: '/panel/pedidos?estado=pending_payment' }),
    ])
  })

  it('atascados: pedido sin pago a los 7 días, no antes', () => {
    const hoy = componerHoy(
      {
        ...vacio,
        pedidosSinPago: [
          { ref: 'RECIEN', customerName: 'Recién', createdAt: new Date('2026-09-09T15:00:00Z') },
          { ref: 'VIEJO', customerName: 'Viejo', createdAt: new Date('2026-09-07T15:00:00Z') },
        ],
      },
      HOY,
    )
    expect(hoy.atascados.map((a) => a.clave)).toEqual(['sin-pago:VIEJO'])
  })

  it('próximas: las de 30 días o menos, por fecha, con su tasa de respuesta', () => {
    const hoy = componerHoy(
      {
        ...vacio,
        eventos: [
          evento({ slug: 'dos', eventDate: '2026-09-28', grupos: 0, respondidos: 0, status: 'draft' }),
          evento({ slug: 'uno', eventDate: '2026-09-16' }),
          evento({ slug: 'treinta', eventDate: '2026-10-14' }),
          evento({ slug: 'lejos', eventDate: '2026-10-15' }),
        ],
      },
      HOY,
    )
    expect(hoy.proximas.map((p) => [p.slug, p.dias, p.ratio])).toEqual([
      ['uno', 2, 0.4],
      ['dos', 14, null],
      ['treinta', 30, 0.4],
    ])
  })

  it('el total cuenta los avisos, no las próximas bodas', () => {
    const hoy = componerHoy(
      {
        ...vacio,
        consultasNuevas: [{ id: 'c1', name: 'María', createdAt: new Date('2026-09-14T15:00:00Z'), eventDate: null }],
        eventos: [evento({})],
      },
      HOY,
    )
    expect(hoy.total).toBe(1)
    expect(hoy.proximas).toHaveLength(1)
  })
})

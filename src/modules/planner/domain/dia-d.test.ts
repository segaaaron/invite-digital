import { describe, expect, it } from 'vitest'
import { extensionDeDocumento, horaEnBolivia, leerDocumento, mesasConFaltantes, pagosDelDia, proveedoresPorLlegar } from './dia-d'

describe('horaEnBolivia', () => {
  it('es la hora de La Paz, no la del servidor', () => {
    expect(horaEnBolivia(new Date('2027-05-16T02:15:00Z'))).toBe('22:15')
  })
})

describe('proveedoresPorLlegar', () => {
  it('los que tienen trato y no llegaron, por hora de llegada; sin hora, al final', () => {
    const lista = [
      { id: 'a', service: 'Torta', status: 'confirmado' as const, arrivalTime: '19:00', arrivedAt: null },
      { id: 'b', service: 'DJ', status: 'contratado' as const, arrivalTime: '17:30', arrivedAt: null },
      { id: 'c', service: 'Flores', status: 'confirmado' as const, arrivalTime: '16:00', arrivedAt: new Date() },
      { id: 'd', service: 'Show', status: 'cotizando' as const, arrivalTime: '20:00', arrivedAt: null },
      { id: 'e', service: 'Foto', status: 'reservado' as const, arrivalTime: null, arrivedAt: null },
    ]
    expect(proveedoresPorLlegar(lista).map((p) => p.id)).toEqual(['b', 'a', 'e'])
  })
})

describe('pagosDelDia', () => {
  it('lo que vence hoy o ya venció y no está pagado', () => {
    const partidas = [
      {
        id: 'p',
        concept: 'Salón',
        pagos: [
          { id: '1', amountCents: 1, dueDate: '2027-05-15', paidAt: null },
          { id: '2', amountCents: 1, dueDate: '2027-05-16', paidAt: null },
          { id: '3', amountCents: 1, dueDate: '2027-05-10', paidAt: null },
          { id: '4', amountCents: 1, dueDate: '2027-05-15', paidAt: new Date() },
        ],
      },
    ]
    expect(pagosDelDia(partidas, '2027-05-15').map((p) => p.id)).toEqual(['3', '1'])
  })
})

describe('mesasConFaltantes', () => {
  it('por mesa, los grupos que aún no llegaron; las mesas completas no salen', () => {
    const mesas = [
      { id: 'm1', label: 'Mesa 1', groups: [{ id: 'g1', label: 'Rojas' }, { id: 'g2', label: 'Peña' }] },
      { id: 'm2', label: 'Mesa 2', groups: [{ id: 'g3', label: 'Vargas' }] },
    ]
    expect(mesasConFaltantes(mesas, new Set(['g1', 'g3']))).toEqual([{ id: 'm1', label: 'Mesa 1', faltan: ['Peña'] }])
  })
})

describe('documentos', () => {
  it('admite PDF e imágenes hasta 10 MB, de un tipo conocido', () => {
    expect(leerDocumento({ kind: 'contrato', topic: '', size: 20 * 1024 * 1024 })).toMatchObject({ ok: false })
    expect(leerDocumento({ kind: 'recibo', topic: '', size: 10 })).toMatchObject({ ok: false })
    expect(leerDocumento({ kind: 'referencia', topic: '  Vestido ', size: 10 })).toEqual({ ok: true, kind: 'referencia', topic: 'Vestido' })
    expect(extensionDeDocumento('application/pdf')).toBe('pdf')
    expect(extensionDeDocumento('image/jpeg')).toBe('jpg')
  })
})

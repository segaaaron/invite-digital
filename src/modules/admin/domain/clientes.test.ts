import { describe, expect, it } from 'vitest'
import { agruparClientes, filtrarClientes } from './clientes'

const d = (dia: number) => new Date(Date.UTC(2026, 8, dia))

describe('agruparClientes', () => {
  it('une consulta, pedido, cuenta y evento de la misma persona por correo o teléfono', () => {
    const clientes = agruparClientes({
      consultas: [{ id: 'c1', name: 'ana', email: 'Ana@Mail.bo', phone: '+591 7123 4567', status: 'won', createdAt: d(1) }],
      pedidos: [{ publicRef: 'ABC', customerName: 'Ana Vega', contact: '71234567', status: 'approved', createdAt: d(3), eventSlug: 'boda-ana', producto: 'Firma' }],
      cuentas: [{ email: 'ana@mail.bo', phone: null, createdAt: d(4) }],
      eventos: [{ slug: 'boda-ana', title: 'Boda de Ana', eventDate: '2026-12-01', anfitriones: [{ email: 'ana@mail.bo', phone: null }] }],
    })
    expect(clientes).toHaveLength(1)
    const [ana] = clientes
    expect(ana?.nombre).toBe('Ana Vega')
    expect(ana?.cuenta).toBe(true)
    expect(ana?.consultas).toHaveLength(1)
    expect(ana?.pedidos).toHaveLength(1)
    expect(ana?.eventos.map((e) => e.slug)).toEqual(['boda-ana'])
    expect(ana?.ultima).toEqual(d(4))
    expect(ana?.telefonos).toEqual(['+591 7123 4567'])
  })

  it('no mezcla a dos personas distintas y ordena por última actividad', () => {
    const clientes = agruparClientes({
      consultas: [
        { id: 'c1', name: 'Ana', email: 'ana@mail.bo', phone: null, status: 'new', createdAt: d(1) },
        { id: 'c2', name: 'Beto', email: 'beto@mail.bo', phone: null, status: 'new', createdAt: d(2) },
      ],
      pedidos: [],
      cuentas: [],
      eventos: [],
    })
    expect(clientes.map((c) => c.nombre)).toEqual(['Beto', 'Ana'])
  })

  it('une dos grupos cuando un tercero trae los dos datos', () => {
    const clientes = agruparClientes({
      consultas: [
        { id: 'c1', name: 'Ana', email: 'ana@mail.bo', phone: null, status: 'new', createdAt: d(1) },
        { id: 'c2', name: 'Ana', email: null, phone: '71234567', status: 'new', createdAt: d(2) },
        { id: 'c3', name: 'Ana', email: 'ana@mail.bo', phone: '71234567', status: 'new', createdAt: d(3) },
      ],
      pedidos: [],
      cuentas: [],
      eventos: [],
    })
    expect(clientes).toHaveLength(1)
    expect(clientes[0]?.consultas).toHaveLength(3)
  })

  it('filtra sin tildes, por correo y por dígitos del teléfono', () => {
    const clientes = agruparClientes({
      consultas: [{ id: 'c1', name: 'José Peña', email: 'jose@mail.bo', phone: '+591 7000 1111', status: 'new', createdAt: d(1) }],
      pedidos: [],
      cuentas: [],
      eventos: [],
    })
    expect(filtrarClientes(clientes, 'pena')).toHaveLength(1)
    expect(filtrarClientes(clientes, 'JOSE@')).toHaveLength(1)
    expect(filtrarClientes(clientes, '1111')).toHaveLength(1)
    expect(filtrarClientes(clientes, 'maria')).toHaveLength(0)
  })
})

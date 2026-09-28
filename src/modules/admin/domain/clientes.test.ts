import { describe, expect, it } from 'vitest'
import { agruparClientes, clavesDeNota, etapaDeCliente, filtrarClientes, tieneContacto, valorDeCliente } from './clientes'

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

  it('una cuenta dada de alta a mano se llama por el nombre que se le puso, no por su correo', () => {
    const [carla] = agruparClientes({ consultas: [], pedidos: [], cuentas: [{ email: 'carla@mail.bo', phone: null, createdAt: d(2), nombre: 'Carla Rojas' }], eventos: [] })
    expect(carla?.nombre).toBe('Carla Rojas')
    const [sinNombre] = agruparClientes({ consultas: [], pedidos: [], cuentas: [{ email: 'beto@mail.bo', phone: null, createdAt: d(2) }], eventos: [] })
    expect(sinNombre?.nombre).toBe('beto@mail.bo')
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

describe('etapa, valor y contactos de un cliente', () => {
  const base = { clave: 'e:a@b.bo', nombre: 'Ana', correos: ['a@b.bo'], telefonos: ['+591 70000001'], cuenta: false, consultas: [], pedidos: [], eventos: [], ultima: new Date() }
  const pedido = (status: string, amountCents: number | null = 100_000) => ({ publicRef: 'R', customerName: 'Ana', contact: 'a@b.bo', status, createdAt: new Date(), eventSlug: null, producto: 'Firma 3D', amountCents })
  const consulta = (status: string) => ({ id: 'c', name: 'Ana', email: 'a@b.bo', phone: null, status, createdAt: new Date() })
  const evento = (eventDate: string) => ({ slug: 's', title: 'Boda', eventDate, anfitriones: [] })

  it('pedir un plan no es ser cliente: se es cliente al pagar o al tener evento', () => {
    expect(etapaDeCliente({ ...base, consultas: [consulta('new')] }, '2026-09-28')).toBe('prospecto')
    expect(etapaDeCliente({ ...base, pedidos: [pedido('pending_payment')] }, '2026-09-28')).toBe('pidio_plan')
    expect(etapaDeCliente({ ...base, pedidos: [pedido('approved')] }, '2026-09-28')).toBe('cliente')
    expect(etapaDeCliente({ ...base, eventos: [evento('2026-12-05')] }, '2026-09-28')).toBe('cliente')
    expect(etapaDeCliente({ ...base, eventos: [evento('2026-05-05')] }, '2026-09-28')).toBe('celebrado')
    expect(etapaDeCliente({ ...base, consultas: [consulta('lost')], pedidos: [pedido('cancelled')] }, '2026-09-28')).toBe('perdido')
  })

  it('su valor es lo aprobado, y su nota se encuentra por cualquier contacto', () => {
    expect(valorDeCliente({ ...base, pedidos: [pedido('approved'), pedido('approved', 50_000), pedido('pending_payment')] })).toBe(150_000)
    expect(clavesDeNota(base)).toEqual(['e:a@b.bo', 't:70000001'])
    expect(tieneContacto(base, '70000001')).toBe(true)
    expect(tieneContacto(base, 'A@B.BO')).toBe(true)
    expect(tieneContacto(base, 'otra@b.bo')).toBe(false)
  })
})

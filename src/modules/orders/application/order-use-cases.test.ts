import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { FakeFileStorage, FakeOrderRepository } from './fake-order-repository'
import { attachProof, decideOrder, findOrderByRef, listOrders, placeOrder, readProof } from './order-use-cases'

const AHORA = new Date('2026-08-25T12:00:00Z')
const clock = () => AHORA
const png = () => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01])
const ejecutable = () => Buffer.from([0x4d, 0x5a, 0x90, 0x00])

const ALTA = {
  planSlug: 'firma-3d',
  customerName: 'María Aguilar',
  contact: '+59170011122',
  eventDate: '2026-12-05',
  notes: null,
}

const conPedido = async () => {
  const orders = new FakeOrderRepository()
  const alta = await placeOrder({ orders, clock })(ALTA)
  if (!isOk(alta)) throw new Error('el alta debería funcionar')
  return { orders, order: alta.value }
}

const subir = (orders: FakeOrderRepository, storage = new FakeFileStorage(), key = 'clave-fija') =>
  attachProof({ orders, storage, clock, newKey: () => key })

describe('placeOrder', () => {
  it('crea el pedido esperando pago, con su referencia', async () => {
    const { order } = await conPedido()

    expect(order.status).toBe('pending_payment')
    expect(order.publicRef).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/)
  })

  it('exige nombre y contacto', async () => {
    const orders = new FakeOrderRepository()
    const crear = placeOrder({ orders, clock })

    expect(isErr(await crear({ ...ALTA, customerName: '   ' }))).toBe(true)
    expect(isErr(await crear({ ...ALTA, contact: '' }))).toBe(true)
    expect(orders.orders).toEqual([])
  })

  it('reintenta si la referencia ya existía', async () => {
    const orders = new FakeOrderRepository()
    let miradas = 0
    const original = orders.findByRef.bind(orders)
    orders.findByRef = async (ref) => {
      miradas += 1
      // La primera referencia acuñada choca; la segunda entra.
      return miradas === 1 ? ({ id: 'ocupado' } as never) : original(ref)
    }

    const alta = await placeOrder({ orders, clock })(ALTA)

    expect(isOk(alta)).toBe(true)
    expect(miradas).toBe(2)
  })
})

describe('findOrderByRef', () => {
  it('encuentra el pedido aunque la referencia venga en minúsculas y con espacios', async () => {
    const { orders, order } = await conPedido()

    const hallado = await findOrderByRef({ orders, clock })(` ${order.publicRef.toLowerCase()} `)

    expect(isOk(hallado) && hallado.value.order.id).toBe(order.id)
  })

  it('una referencia desconocida es «no existe», nunca «prohibido»', async () => {
    const orders = new FakeOrderRepository()

    const hallado = await findOrderByRef({ orders, clock })('ZZZZZZZZ')

    expect(isErr(hallado) && hallado.error.kind).toBe('not_found')
  })
})

describe('attachProof', () => {
  it('guarda el fichero con una clave propia, no con el nombre que mandó el cliente', async () => {
    const { orders, order } = await conPedido()
    const storage = new FakeFileStorage()

    const subido = await subir(orders, storage)({
      rawRef: order.publicRef,
      bytes: png(),
      declaredName: '../../etc/passwd',
      declaredType: 'image/png',
    })

    expect(isOk(subido)).toBe(true)
    expect([...storage.files.keys()]).toEqual(['clave-fija'])
    // El nombre original se conserva solo como texto que se enseña.
    expect(orders.proofs[0]?.originalName).toBe('../../etc/passwd')
  })

  it('pasa el pedido a comprobante presentado', async () => {
    const { orders, order } = await conPedido()

    await subir(orders)({ rawRef: order.publicRef, bytes: png(), declaredName: 'c.png', declaredType: 'image/png' })

    expect((await orders.findByRef(order.publicRef))?.status).toBe('proof_submitted')
  })

  it('un fichero que miente sobre su tipo no llega al disco', async () => {
    const { orders, order } = await conPedido()
    const storage = new FakeFileStorage()

    const subido = await subir(orders, storage)({
      rawRef: order.publicRef,
      bytes: ejecutable(),
      declaredName: 'comprobante.png',
      declaredType: 'image/png',
    })

    expect(isErr(subido) && subido.error.kind).toBe('proof_rejected')
    expect(storage.files.size).toBe(0)
    expect(orders.proofs).toEqual([])
  })

  it('un pedido aprobado no admite más comprobantes', async () => {
    const { orders, order } = await conPedido()
    await orders.setStatus({ id: order.id, status: 'approved', decisionNote: null, decidedAt: AHORA })

    const subido = await subir(orders)({
      rawRef: order.publicRef,
      bytes: png(),
      declaredName: 'c.png',
      declaredType: 'image/png',
    })

    expect(isErr(subido) && subido.error.kind).toBe('wrong_status')
  })

  it('uno rechazado sí: rechazar no es el final del pedido', async () => {
    const { orders, order } = await conPedido()
    await orders.setStatus({ id: order.id, status: 'rejected', decisionNote: 'Importe distinto', decidedAt: AHORA })

    const subido = await subir(orders)({
      rawRef: order.publicRef,
      bytes: png(),
      declaredName: 'c.png',
      declaredType: 'image/png',
    })

    expect(isOk(subido)).toBe(true)
    // Y la nota del rechazo anterior se limpia: ya no describe el estado actual.
    expect((await orders.findByRef(order.publicRef))?.decisionNote).toBeNull()
  })
})

describe('decideOrder', () => {
  const conComprobante = async () => {
    const { orders, order } = await conPedido()
    await subir(orders)({ rawRef: order.publicRef, bytes: png(), declaredName: 'c.png', declaredType: 'image/png' })
    return { orders, order }
  }

  it('aprueba y deja la fecha de la decisión', async () => {
    const { orders, order } = await conComprobante()

    const hecho = await decideOrder({ orders, clock })({ orderId: order.id, decision: 'approved', note: '' })

    expect(isOk(hecho)).toBe(true)
    expect(await orders.findById(order.id)).toMatchObject({ status: 'approved', decidedAt: AHORA })
  })

  it('rechazar sin motivo no vale: el cliente se queda sin saber qué arreglar', async () => {
    const { orders, order } = await conComprobante()

    const hecho = await decideOrder({ orders, clock })({ orderId: order.id, decision: 'rejected', note: '  ' })

    expect(isErr(hecho) && hecho.error.kind).toBe('invalid_input')
    expect(await orders.findById(order.id)).toMatchObject({ status: 'proof_submitted' })
  })

  it('no se decide sobre un pedido sin comprobante', async () => {
    const { orders, order } = await conPedido()

    const hecho = await decideOrder({ orders, clock })({ orderId: order.id, decision: 'approved', note: '' })

    expect(isErr(hecho) && hecho.error.kind).toBe('wrong_status')
  })

  it('lo aprobado no se vuelve a decidir', async () => {
    const { orders, order } = await conComprobante()
    await decideOrder({ orders, clock })({ orderId: order.id, decision: 'approved', note: '' })

    const otra = await decideOrder({ orders, clock })({ orderId: order.id, decision: 'rejected', note: 'me arrepentí' })

    expect(isErr(otra) && otra.error.kind).toBe('wrong_status')
  })
})

describe('listOrders y readProof', () => {
  it('la bandeja trae cada pedido con sus comprobantes', async () => {
    const { orders, order } = await conPedido()
    await subir(orders)({ rawRef: order.publicRef, bytes: png(), declaredName: 'c.png', declaredType: 'image/png' })

    const lista = await listOrders({ orders, clock })()

    expect(isOk(lista) && lista.value).toHaveLength(1)
    expect(isOk(lista) && lista.value[0]?.proofs.map((p) => p.originalName)).toEqual(['c.png'])
  })

  it('un pedido sin comprobantes trae la lista vacía, no falta de la bandeja', async () => {
    const { orders } = await conPedido()

    const lista = await listOrders({ orders, clock })()

    expect(isOk(lista) && lista.value[0]?.proofs).toEqual([])
  })

  it('el comprobante se lee por su identificador', async () => {
    const { orders, order } = await conPedido()
    const storage = new FakeFileStorage()
    await subir(orders, storage, 'k')({
      rawRef: order.publicRef,
      bytes: png(),
      declaredName: 'c.png',
      declaredType: 'image/png',
    })

    const leido = await readProof({ orders, storage, clock })('p1')

    expect(isOk(leido) && Buffer.from(leido.value.bytes).equals(png())).toBe(true)
  })

  it('un comprobante cuyo fichero no está en el almacén no se inventa', async () => {
    const { orders, order } = await conPedido()
    await orders.addProof({ orderId: order.id, storageKey: 'perdido', originalName: 'c.png', mime: 'image/png', sizeBytes: 9 })

    const leido = await readProof({ orders, storage: new FakeFileStorage(), clock })('p1')

    expect(isErr(leido) && leido.error.kind).toBe('not_found')
  })
})

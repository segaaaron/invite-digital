import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { orderProofs, orders } from '@/shared/db/schema'
import { drizzleOrderRepository as repo } from './drizzle-order-repository'

const creados: string[] = []

const nuevo = async (patch: Partial<Parameters<typeof repo.create>[0]> = {}) => {
  const order = await repo.create({
    publicRef: `T${crypto.randomUUID().replaceAll('-', '').slice(0, 7).toUpperCase()}`,
    planSlug: 'firma-3d',
    // Explícito y no opcional en el puerto: un pedido sin diseño es una decisión —llegó
    // directo a los planes—, no un campo que se olvidó de poner quien escribe la llamada.
    templateSlug: null,
    customerName: 'María Aguilar',
    contact: '+59170011122',
    eventDate: '2026-12-05',
    notes: null,
    ...patch,
  })
  creados.push(order.id)
  return order
}

afterAll(async () => {
  for (const id of creados) await db.delete(orders).where(eq(orders.id, id))
})

describe('drizzleOrderRepository', () => {
  it('crea el pedido resolviendo el plan por su slug y lo relee con el nombre en español', async () => {
    const order = await nuevo()

    expect(order.status).toBe('pending_payment')
    expect(order.planSlug).toBe('firma-3d')
    expect(order.planName).toBe('Firma 3D')
  })

  it('un plan que no existe deja el pedido sin plan, no revienta el alta', async () => {
    // El cliente ya rellenó el formulario: perder su pedido porque el catálogo cambió
    // entre que lo abrió y lo envió sería lo peor de los dos mundos.
    const order = await nuevo({ planSlug: 'plan-que-no-existe' })

    expect(order.planSlug).toBeNull()
    expect(order.planName).toBeNull()
  })

  it('la referencia es única en toda la base', async () => {
    const order = await nuevo()

    await expect(nuevo({ publicRef: order.publicRef })).rejects.toThrow()
  })

  it('encuentra por referencia y por identificador, y nada por lo que no existe', async () => {
    const order = await nuevo()

    expect((await repo.findByRef(order.publicRef))?.id).toBe(order.id)
    expect((await repo.findById(order.id))?.publicRef).toBe(order.publicRef)
    expect(await repo.findByRef('ZZZZZZZZ')).toBeNull()
    expect(await repo.findById(crypto.randomUUID())).toBeNull()
  })

  it('guarda la decisión con su nota y su fecha', async () => {
    const order = await nuevo()
    const cuando = new Date('2026-08-25T12:00:00.000Z')

    await repo.setStatus({ id: order.id, status: 'rejected', decisionNote: 'Importe distinto', decidedAt: cuando })

    expect(await repo.findById(order.id)).toMatchObject({
      status: 'rejected',
      decisionNote: 'Importe distinto',
      decidedAt: cuando,
    })
  })

  it('los comprobantes de varios pedidos vienen agrupados en una sola consulta', async () => {
    const uno = await nuevo()
    const dos = await nuevo()
    await repo.addProof({ orderId: uno.id, storageKey: crypto.randomUUID(), originalName: 'a.png', mime: 'image/png', sizeBytes: 10 })
    await repo.addProof({ orderId: dos.id, storageKey: crypto.randomUUID(), originalName: 'b.pdf', mime: 'application/pdf', sizeBytes: 20 })

    const porPedido = await repo.listProofsFor([uno.id, dos.id])

    expect(porPedido.get(uno.id)?.map((p) => p.originalName)).toEqual(['a.png'])
    expect(porPedido.get(dos.id)?.map((p) => p.originalName)).toEqual(['b.pdf'])
  })

  it('la lista vacía no genera un «in ()», que Postgres rechaza', async () => {
    expect(await repo.listProofsFor([])).toEqual(new Map())
  })

  it('borrar el pedido se lleva sus comprobantes', async () => {
    const order = await nuevo()
    await repo.addProof({ orderId: order.id, storageKey: crypto.randomUUID(), originalName: 'c.png', mime: 'image/png', sizeBytes: 9 })

    await db.delete(orders).where(eq(orders.id, order.id))

    expect(await db.select().from(orderProofs).where(eq(orderProofs.orderId, order.id))).toEqual([])
  })
})

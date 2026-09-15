import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { addons, events, orderProofs, orders, plans } from '@/shared/db/schema'
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

  it('congela el importe del plan al pedir: cambiar el precio después no lo mueve', async () => {
    const [plan] = await db.select({ precio: plans.priceCents }).from(plans).where(eq(plans.slug, 'firma-3d'))
    const order = await nuevo()

    await db.update(plans).set({ priceCents: plan!.precio + 12345 }).where(eq(plans.slug, 'firma-3d'))
    try {
      const [fila] = await db.select({ importe: orders.amountCents, moneda: orders.currency }).from(orders).where(eq(orders.id, order.id))
      expect(fila).toEqual({ importe: plan!.precio, moneda: 'BOB' })
    } finally {
      await db.update(plans).set({ priceCents: plan!.precio }).where(eq(plans.slug, 'firma-3d'))
    }
  })

  it('un plan retirado no se compra por POST: el pedido queda sin plan y sin importe', async () => {
    await db.update(plans).set({ isActive: false }).where(eq(plans.slug, 'firma-3d'))
    try {
      const order = await nuevo()
      const [fila] = await db.select({ importe: orders.amountCents }).from(orders).where(eq(orders.id, order.id))
      expect(order.planSlug).toBeNull()
      expect(fila?.importe).toBeNull()
    } finally {
      await db.update(plans).set({ isActive: true }).where(eq(plans.slug, 'firma-3d'))
    }
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

  it('cuenta los pedidos de un estado sin traerlos: la insignia de la barra se pinta en cada página', async () => {
    const antes = await repo.countByStatus('proof_submitted')
    const uno = await nuevo()
    await nuevo()
    await repo.setStatus({ id: uno.id, status: 'proof_submitted', decisionNote: null, decidedAt: null })
    expect(await repo.countByStatus('proof_submitted')).toBe(antes + 1)
  })

  it('pagina en la base: por estado, con la prioridad que pide la bandeja y sin traer el resto', async () => {
    const cliente = `Pagina ${crypto.randomUUID().slice(0, 6)}`
    const alta = async (status: 'pending_payment' | 'proof_submitted' | 'approved', minutos: number) => {
      const o = await nuevo({ customerName: cliente })
      await db.update(orders).set({ status, createdAt: new Date(Date.now() - minutos * 60_000) }).where(eq(orders.id, o.id))
      return o.id
    }
    const aprobadoNuevo = await alta('approved', 1)
    const revisarViejo = await alta('proof_submitted', 30)
    const revisarNuevo = await alta('proof_submitted', 2)
    const sinPago = await alta('pending_payment', 3)
    const prioridad = ['proof_submitted', 'pending_payment', 'rejected', 'approved'] as const

    const conteo = await repo.countByStatusAll()
    expect(conteo.proof_submitted).toBeGreaterThanOrEqual(2)
    expect(Object.keys(conteo).sort()).toEqual(['approved', 'pending_payment', 'proof_submitted', 'rejected'])

    // Todos: primero lo que pide acción y lo más nuevo dentro; el tope se aplica en la base.
    const mios = (await repo.listPage({ status: null, limit: 5000, prioridad })).filter((o) => o.customerName === cliente).map((o) => o.id)
    expect(mios).toEqual([revisarNuevo, revisarViejo, sinPago, aprobadoNuevo])
    expect(await repo.listPage({ status: null, limit: 2, prioridad })).toHaveLength(2)

    // Filtrado: solo ese estado.
    const porRevisar = await repo.listPage({ status: 'proof_submitted', limit: 5000, prioridad })
    expect(porRevisar.every((o) => o.status === 'proof_submitted')).toBe(true)
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

  it('un pedido de extra congela el precio del extra, va atado a su evento y no tiene plan', async () => {
    const [evento] = await db
      .insert(events)
      .values({ slug: `extra-${crypto.randomUUID().slice(0, 8)}`, title: 'Boda del extra', eventDate: '2027-05-15', rsvpDeadline: '2027-04-30', locale: 'es', themeKey: 'boda-bot', status: 'draft' })
      .returning({ id: events.id })
    await db.update(addons).set({ isActive: true, priceCents: 150_00 }).where(eq(addons.slug, 'mas-40-grupos'))
    try {
      const order = await repo.createForAddon({ publicRef: `X${crypto.randomUUID().replaceAll('-', '').slice(0, 7).toUpperCase()}`, addonSlug: 'mas-40-grupos', eventId: evento!.id, customerName: 'Ana', contact: 'ana@x.bo' })
      expect(order).not.toBeNull()
      creados.push(order!.id)
      expect(order).toMatchObject({ planSlug: null, addonSlug: 'mas-40-grupos', addonName: '+40 grupos de invitados', eventId: evento!.id })
      const [fila] = await db.select({ amount: orders.amountCents }).from(orders).where(eq(orders.id, order!.id))
      expect(fila?.amount).toBe(150_00)

      // Un segundo «Pedir» —doble clic, otra pestaña, a la vez— devuelve el pedido abierto, no otro.
      const ref = () => `X${crypto.randomUUID().replaceAll('-', '').slice(0, 7).toUpperCase()}`
      const alta = { addonSlug: 'mas-40-grupos', eventId: evento!.id, customerName: 'Ana', contact: 'ana@x.bo' }
      const [uno, dos] = await Promise.all([repo.createForAddon({ ...alta, publicRef: ref() }), repo.createForAddon({ ...alta, publicRef: ref() })])
      expect(uno?.id).toBe(order!.id)
      expect(dos?.id).toBe(order!.id)
      await db.update(orders).set({ status: 'rejected' }).where(eq(orders.id, order!.id))
      expect((await repo.createForAddon({ ...alta, publicRef: ref() }))?.id).toBe(order!.id)
      // Aprobado, lo que suma se puede volver a comprar.
      await db.update(orders).set({ status: 'approved' }).where(eq(orders.id, order!.id))
      const otra = await repo.createForAddon({ ...alta, publicRef: ref() })
      expect(otra?.id).not.toBe(order!.id)
      creados.push(otra!.id)
      await db.update(orders).set({ status: 'approved' }).where(eq(orders.id, otra!.id))

      // Los pedidos de extras de un evento, sin traer la bandeja entera.
      const delEvento = await repo.listAddonOrdersOf(evento!.id)
      expect(delEvento.map((o) => o.id).sort()).toEqual([order!.id, otra!.id].sort())
      expect(await repo.listAddonOrdersOf(crypto.randomUUID())).toEqual([])

      // Apagado, no se vende: ni por POST.
      await db.update(addons).set({ isActive: false }).where(eq(addons.slug, 'mas-40-grupos'))
      expect(await repo.createForAddon({ publicRef: 'ZZZZZZZZ', addonSlug: 'mas-40-grupos', eventId: evento!.id, customerName: 'Ana', contact: 'ana@x.bo' })).toBeNull()
    } finally {
      await db.update(addons).set({ isActive: false, priceCents: 15000 }).where(eq(addons.slug, 'mas-40-grupos'))
      await db.delete(orders).where(eq(orders.eventId, evento!.id))
      await db.delete(events).where(eq(events.id, evento!.id))
    }
  })
})


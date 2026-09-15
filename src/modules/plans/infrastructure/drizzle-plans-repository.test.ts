import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { eventAddons, events, orders, planChangeRequests, plans } from '@/shared/db/schema'
import { drizzlePlansRepository } from './drizzle-plans-repository'

const eventId = crypto.randomUUID()
const otroEventId = crypto.randomUUID()

const planId = async (slug: string): Promise<string> => {
  const [row] = await db.select({ id: plans.id }).from(plans).where(eq(plans.slug, slug)).limit(1)
  if (!row) throw new Error(`No existe el plan ${slug} — ¿corriste \`pnpm db:seed\`?`)
  return row.id
}

const nuevoEvento = async (id: string, planId: string | null) => {
  await db.insert(events).values({
    id,
    slug: `planes-${id.slice(0, 8)}`,
    title: 'Boda de prueba',
    eventDate: '2027-04-10',
    rsvpDeadline: '2027-03-20',
    locale: 'es',
    themeKey: 'clasico',
    status: 'live',
    planId,
  })
}

let atelier = ''
let firma = ''
let alta = ''

beforeAll(async () => {
  atelier = await planId('atelier')
  firma = await planId('firma-3d')
  alta = await planId('alta-costura')
  await nuevoEvento(eventId, atelier)
  await nuevoEvento(otroEventId, null)
})

afterAll(async () => {
  await db.delete(events).where(eq(events.id, eventId))
  await db.delete(events).where(eq(events.id, otroEventId))
})

const nuevaSolicitud = async (input: { id?: string; eventId?: string; requestedPlanId?: string }) => {
  const id = input.id ?? crypto.randomUUID()
  await drizzlePlansRepository.insertRequest({
    id,
    eventId: input.eventId ?? eventId,
    requestedPlanId: input.requestedPlanId ?? firma,
    note: null,
    createdAt: new Date('2026-08-21T10:00:00.000Z'),
  })
  return id
}

describe('lectura del catálogo', () => {
  it('el plan del evento sale con sus límites', async () => {
    const row = await drizzlePlansRepository.findEventPlan(eventId)

    expect(row?.slug).toBe('atelier')
    expect(row?.maxGuestGroups).toBe(40)
    expect(row?.includesRegistry).toBe(false)
  })

  it('un evento sin plan devuelve null, no una fila con todo a nulo', async () => {
    // Un `leftJoin` devolvería una fila fantasma que parece un plan y no lo es.
    expect(await drizzlePlansRepository.findEventPlan(otroEventId)).toBeNull()
  })

  it('el más barato activo es atelier', async () => {
    expect((await drizzlePlansRepository.findCheapestActivePlan())?.slug).toBe('atelier')
  })
})

describe('el índice único parcial', () => {
  it('corta de verdad: dos solicitudes pendientes del mismo evento no caben', async () => {
    // Esta es la prueba que importa de la rebanada. Que el índice exista en el esquema
    // no prueba que corte: un `WHERE` mal escrito o un índice no creado dejarían pasar
    // las dos, y el atelier vería dos solicitudes sin saber a cuál hacer caso.
    await nuevaSolicitud({})

    await expect(nuevaSolicitud({ requestedPlanId: alta })).rejects.toThrow()

    await db.delete(planChangeRequests).where(eq(planChangeRequests.eventId, eventId))
  })

  it('una pendiente y otra ya aplicada conviven sin problema', async () => {
    // El índice es parcial a propósito: si cubriera todas las filas, un evento no
    // podría cambiar de plan dos veces en su vida.
    const vieja = await nuevaSolicitud({ requestedPlanId: firma })
    await drizzlePlansRepository.applyRequest(vieja, new Date('2026-08-21T11:00:00.000Z'))

    await expect(nuevaSolicitud({ requestedPlanId: alta })).resolves.toBeTypeOf('string')

    await db.delete(planChangeRequests).where(eq(planChangeRequests.eventId, eventId))
    await db.update(events).set({ planId: atelier }).where(eq(events.id, eventId))
  })
})

describe('aplicar una solicitud', () => {
  it('cambia el plan del evento y marca la solicitud, en la misma transacción', async () => {
    const id = await nuevaSolicitud({ requestedPlanId: alta })

    const aplicada = await drizzlePlansRepository.applyRequest(id, new Date('2026-08-21T12:00:00.000Z'))

    expect(aplicada).toBe(true)
    expect((await drizzlePlansRepository.findEventPlan(eventId))?.slug).toBe('alta-costura')
    // Los días en línea viajan con el plan: la retención del evento pasa a ser la del nuevo.
    const [evento] = await db.select({ retentionDays: events.retentionDays }).from(events).where(eq(events.id, eventId))
    const [plan] = await db.select({ onlineDays: plans.onlineDays }).from(plans).where(eq(plans.id, alta))
    expect(evento?.retentionDays).toBe(plan?.onlineDays)

    const solicitud = await drizzlePlansRepository.findRequest(id)
    expect(solicitud?.status).toBe('applied')
    expect(solicitud?.resolvedAt).not.toBeNull()

    await db.delete(planChangeRequests).where(eq(planChangeRequests.eventId, eventId))
    await db.update(events).set({ planId: atelier }).where(eq(events.id, eventId))
  })

  it('aplicar dos veces la misma solicitud no vuelve a tocar el evento', async () => {
    // El guardia va en el propio UPDATE, no solo en el caso de uso: entre leer el
    // estado y escribirlo cabe otra pestaña del panel aplicando lo mismo.
    const id = await nuevaSolicitud({ requestedPlanId: firma })
    await drizzlePlansRepository.applyRequest(id, new Date('2026-08-21T12:00:00.000Z'))
    await db.update(events).set({ planId: atelier }).where(eq(events.id, eventId))

    const segunda = await drizzlePlansRepository.applyRequest(id, new Date('2026-08-21T13:00:00.000Z'))

    expect(segunda).toBe(false)
    expect((await drizzlePlansRepository.findEventPlan(eventId))?.slug).toBe('atelier')

    await db.delete(planChangeRequests).where(eq(planChangeRequests.eventId, eventId))
  })

  it('rechazar la marca resuelta y deja el plan como estaba', async () => {
    const id = await nuevaSolicitud({ requestedPlanId: alta })

    expect(await drizzlePlansRepository.rejectRequest(id, new Date('2026-08-21T12:00:00.000Z'))).toBe(true)
    expect((await drizzlePlansRepository.findRequest(id))?.status).toBe('rejected')
    expect((await drizzlePlansRepository.findEventPlan(eventId))?.slug).toBe('atelier')

    await db.delete(planChangeRequests).where(eq(planChangeRequests.eventId, eventId))
  })
})

describe('findPendingRequest', () => {
  it('solo devuelve la pendiente, no las ya resueltas', async () => {
    const resuelta = await nuevaSolicitud({ requestedPlanId: firma })
    await drizzlePlansRepository.rejectRequest(resuelta, new Date('2026-08-21T12:00:00.000Z'))

    expect(await drizzlePlansRepository.findPendingRequest(eventId)).toBeNull()

    const pendiente = await nuevaSolicitud({ requestedPlanId: alta })
    expect((await drizzlePlansRepository.findPendingRequest(eventId))?.id).toBe(pendiente)

    await db.delete(planChangeRequests).where(eq(planChangeRequests.eventId, eventId))
  })
})

describe('borrar el evento', () => {
  it('se lleva sus solicitudes por cascada: no quedan huérfanas', async () => {
    const suEvento = crypto.randomUUID()
    await nuevoEvento(suEvento, atelier)
    await nuevaSolicitud({ eventId: suEvento, requestedPlanId: firma })

    await db.delete(events).where(eq(events.id, suEvento))

    const quedan = await db
      .select({ id: planChangeRequests.id })
      .from(planChangeRequests)
      .where(and(eq(planChangeRequests.eventId, suEvento)))
    expect(quedan).toHaveLength(0)
  })
})

describe('aplicar un extra aprobado', () => {
  it('lo suma a la capacidad del evento una sola vez y los días en línea alargan la retención', async () => {
    const [antes] = await db.select({ dias: events.retentionDays }).from(events).where(eq(events.id, eventId))
    const [pedido] = await db
      .insert(orders)
      .values({ publicRef: `A${crypto.randomUUID().replaceAll('-', '').slice(0, 7).toUpperCase()}`, addonSlug: 'mas-6-meses', eventId, customerName: 'Ana', contact: 'ana@x.bo', status: 'approved' })
      .returning({ id: orders.id })

    expect(await drizzlePlansRepository.applyExtra(pedido!.id)).toBe(true)
    expect(await drizzlePlansRepository.applyExtra(pedido!.id)).toBe(false)

    expect(await drizzlePlansRepository.listEventExtras(eventId)).toEqual([{ effect: 'mas_dias', amount: 180 }])
    const [despues] = await db.select({ dias: events.retentionDays }).from(events).where(eq(events.id, eventId))
    expect(despues!.dias).toBe(antes!.dias + 180)

    await db.delete(orders).where(eq(orders.id, pedido!.id))
    await db.delete(eventAddons).where(eq(eventAddons.eventId, eventId))
  })
})


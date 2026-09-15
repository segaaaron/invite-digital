import { eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events } from '@/shared/db/schema'
import { sembrarTareas } from '../domain/tareas'
import { drizzlePlannerStore as store } from './drizzle-planner-store'

const uno = crypto.randomUUID()
const otro = crypto.randomUUID()

beforeAll(async () => {
  for (const id of [uno, otro]) {
    await db.insert(events).values({
      id,
      slug: `planner-${id.slice(0, 8)}`,
      title: 'Evento del planner',
      eventDate: '2027-05-15',
      rsvpDeadline: '2027-04-30',
      locale: 'es',
      themeKey: 'boda-bot',
      status: 'draft',
    })
  }
})

afterAll(async () => {
  await db.delete(events).where(inArray(events.id, [uno, otro]))
})

describe('drizzlePlannerStore · tareas', () => {
  it('guarda la plantilla en su orden y la devuelve con sus fechas', async () => {
    await store.insertTasks(uno, sembrarTareas('boda', '2027-05-15'))
    const tareas = await store.listTasks(uno)

    expect(tareas.map((t) => t.sortOrder)).toEqual(tareas.map((_, i) => i))
    expect(tareas[0]).toMatchObject({ stage: 'm12', dueDate: '2026-05-15', doneAt: null })
  })

  it('una tarea de otro evento no se toca desde este', async () => {
    const [tarea] = await store.listTasks(uno)
    expect(await store.updateTask(otro, tarea!.id, { title: 'Ajena' })).toBe(false)
    expect(await store.removeTask(otro, tarea!.id)).toBe(false)
    expect((await store.listTasks(uno))[0]?.title).toBe(tarea!.title)
  })
})

describe('drizzlePlannerStore · presupuesto', () => {
  it('la partida vuelve con sus pagos, y marcar pagado solo vale desde su evento', async () => {
    const id = await store.insertItem(uno, {
      category: 'salon',
      concept: 'Salón Los Encinos',
      estimatedCents: 10_000_00,
      contractedCents: null,
      payer: 'padrino',
      padrinoLabel: 'Tío Jorge',
      notes: null,
    })
    expect(await store.insertPayment(otro, id, { amountCents: 1, dueDate: null })).toBe(false)
    expect(await store.insertPayment(uno, id, { amountCents: 3_000_00, dueDate: '2027-01-10' })).toBe(true)

    const [partida] = await store.listBudget(uno)
    const pago = partida!.pagos[0]!
    expect(partida).toMatchObject({ concept: 'Salón Los Encinos', padrinoLabel: 'Tío Jorge' })
    expect(pago).toMatchObject({ amountCents: 3_000_00, dueDate: '2027-01-10', paidAt: null })

    expect(await store.setPaymentPaid(otro, pago.id, new Date())).toBe(false)
    expect(await store.setPaymentPaid(uno, pago.id, new Date())).toBe(true)
    expect((await store.listBudget(uno))[0]?.pagos[0]?.paidAt).not.toBeNull()

    expect(await store.removeItem(uno, id)).toBe(true)
    expect(await store.listBudget(uno)).toEqual([])
  })

  it('el evento borrado se lleva tareas y presupuesto', async () => {
    const id = crypto.randomUUID()
    await db.insert(events).values({ id, slug: `planner-borra-${id.slice(0, 8)}`, title: 'x', eventDate: '2027-05-15', rsvpDeadline: '2027-04-30', locale: 'es', themeKey: 'boda-bot', status: 'draft' })
    await store.insertTasks(id, sembrarTareas('xv', '2027-05-15'))
    await store.insertItem(id, { category: 'dj', concept: 'DJ', estimatedCents: 1, contractedCents: null, payer: 'anfitriones', padrinoLabel: null, notes: null })
    await db.delete(events).where(eq(events.id, id))

    expect(await store.listTasks(id)).toEqual([])
    expect(await store.listBudget(id)).toEqual([])
  })
})

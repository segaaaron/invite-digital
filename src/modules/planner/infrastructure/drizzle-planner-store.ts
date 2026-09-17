import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { budgetItems, budgetPayments, budgetPlans, plannerTasks } from '@/shared/db/schema'
import type { PlannerStore } from '../application/ports'
import type { Pagador } from '../domain/presupuesto'
import type { Responsable } from '../domain/tareas'

export function createDrizzlePlannerStore(database: DbExecutor = db): PlannerStore {
  /** El pago pertenece al evento a través de su partida: sin esa unión, un id de otro evento valdría. */
  const pagoDelEvento = (eventId: string, paymentId: string) =>
    and(
      eq(budgetPayments.id, paymentId),
      inArray(budgetPayments.itemId, database.select({ id: budgetItems.id }).from(budgetItems).where(eq(budgetItems.eventId, eventId))),
    )

  return {
    async listTasks(eventId) {
      const filas = await database.select().from(plannerTasks).where(eq(plannerTasks.eventId, eventId)).orderBy(asc(plannerTasks.sortOrder), asc(plannerTasks.createdAt))
      return filas.map((f) => ({
        id: f.id,
        stage: f.stage,
        title: f.title,
        dueDate: f.dueDate,
        assignee: f.assignee as Responsable,
        notes: f.notes,
        doneAt: f.doneAt,
        doneBy: f.doneBy,
        sortOrder: f.sortOrder,
      }))
    },

    async insertTasks(eventId, tareas) {
      if (tareas.length === 0) return
      await database.insert(plannerTasks).values(tareas.map((t) => ({ ...t, eventId })))
    },

    async updateTask(eventId, id, patch) {
      const filas = await database
        .update(plannerTasks)
        .set(patch)
        .where(and(eq(plannerTasks.id, id), eq(plannerTasks.eventId, eventId)))
        .returning({ id: plannerTasks.id })
      return filas.length > 0
    },

    async removeTask(eventId, id) {
      const filas = await database
        .delete(plannerTasks)
        .where(and(eq(plannerTasks.id, id), eq(plannerTasks.eventId, eventId)))
        .returning({ id: plannerTasks.id })
      return filas.length > 0
    },

    async getBudgetPlan(eventId) {
      const [fila] = await database.select().from(budgetPlans).where(eq(budgetPlans.eventId, eventId)).limit(1)
      return fila === undefined ? null : { totalCents: fila.totalCents, asignaciones: fila.allocations }
    },
    async saveBudgetPlan(eventId, plan) {
      await database
        .insert(budgetPlans)
        .values({ eventId, totalCents: plan.totalCents, allocations: plan.asignaciones })
        .onConflictDoUpdate({ target: budgetPlans.eventId, set: { totalCents: plan.totalCents, allocations: plan.asignaciones, updatedAt: new Date() } })
    },
    async listBudget(eventId) {
      const partidas = await database.select().from(budgetItems).where(eq(budgetItems.eventId, eventId)).orderBy(asc(budgetItems.createdAt))
      const pagos =
        partidas.length === 0
          ? []
          : await database
              .select()
              .from(budgetPayments)
              .where(inArray(budgetPayments.itemId, partidas.map((p) => p.id)))
              .orderBy(sql`${budgetPayments.dueDate} asc nulls last`, asc(budgetPayments.createdAt))
      return partidas.map((p) => ({
        id: p.id,
        category: p.category,
        concept: p.concept,
        estimatedCents: p.estimatedCents,
        contractedCents: p.contractedCents,
        payer: p.payer as Pagador,
        padrinoLabel: p.padrinoLabel,
        notes: p.notes,
        pagos: pagos.filter((g) => g.itemId === p.id).map((g) => ({ id: g.id, amountCents: g.amountCents, dueDate: g.dueDate, paidAt: g.paidAt, label: g.label })),
      }))
    },

    async insertItem(eventId, item) {
      const [fila] = await database.insert(budgetItems).values({ ...item, eventId }).returning({ id: budgetItems.id })
      return fila!.id
    },

    async updateItem(eventId, id, item) {
      const filas = await database
        .update(budgetItems)
        .set(item)
        .where(and(eq(budgetItems.id, id), eq(budgetItems.eventId, eventId)))
        .returning({ id: budgetItems.id })
      return filas.length > 0
    },

    async removeItem(eventId, id) {
      const filas = await database
        .delete(budgetItems)
        .where(and(eq(budgetItems.id, id), eq(budgetItems.eventId, eventId)))
        .returning({ id: budgetItems.id })
      return filas.length > 0
    },

    async insertPayment(eventId, itemId, pago) {
      const [partida] = await database
        .select({ id: budgetItems.id })
        .from(budgetItems)
        .where(and(eq(budgetItems.id, itemId), eq(budgetItems.eventId, eventId)))
      if (!partida) return false
      await database.insert(budgetPayments).values({ itemId, ...pago })
      return true
    },

    async setPaymentPaid(eventId, paymentId, paidAt) {
      const filas = await database.update(budgetPayments).set({ paidAt }).where(pagoDelEvento(eventId, paymentId)).returning({ id: budgetPayments.id })
      return filas.length > 0
    },

    async removePayment(eventId, paymentId) {
      const filas = await database.delete(budgetPayments).where(pagoDelEvento(eventId, paymentId)).returning({ id: budgetPayments.id })
      return filas.length > 0
    },
  }
}

export const drizzlePlannerStore = createDrizzlePlannerStore()

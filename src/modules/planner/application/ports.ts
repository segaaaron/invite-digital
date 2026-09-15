import type { Pagador, Partida } from '../domain/presupuesto'
import type { NuevaTarea, Responsable, Tarea } from '../domain/tareas'

/** Todas las escrituras van con su `eventId`: una tarea de otro evento no existe para este. */
export interface PlannerStore {
  listTasks(eventId: string): Promise<Tarea[]>
  insertTasks(eventId: string, tareas: readonly NuevaTarea[]): Promise<void>
  updateTask(
    eventId: string,
    id: string,
    patch: Partial<{ title: string; stage: string; dueDate: string | null; assignee: Responsable; notes: string | null; doneAt: Date | null; doneBy: string | null; sortOrder: number }>,
  ): Promise<boolean>
  removeTask(eventId: string, id: string): Promise<boolean>

  listBudget(eventId: string): Promise<Partida[]>
  insertItem(eventId: string, item: PartidaNueva): Promise<string>
  updateItem(eventId: string, id: string, item: PartidaNueva): Promise<boolean>
  removeItem(eventId: string, id: string): Promise<boolean>
  insertPayment(eventId: string, itemId: string, pago: { amountCents: number; dueDate: string | null; label: string | null }): Promise<boolean>
  setPaymentPaid(eventId: string, paymentId: string, paidAt: Date | null): Promise<boolean>
  removePayment(eventId: string, paymentId: string): Promise<boolean>
}

export type PartidaNueva = {
  category: string
  concept: string
  estimatedCents: number
  contractedCents: number | null
  payer: Pagador
  padrinoLabel: string | null
  notes: string | null
}

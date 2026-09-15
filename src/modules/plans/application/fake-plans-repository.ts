import type { ExtraAplicado } from '../domain/extras'
import type { PlanChangeRequestRow, PlanRow, PlansRepository } from './ports'

/**
 * Repositorio en memoria para las pruebas de aplicación. El índice único parcial —una
 * sola solicitud pendiente por evento— aquí NO se imita: es una garantía de la base y
 * se prueba contra Postgres de verdad en `infrastructure`. Imitarlo aquí daría la falsa
 * sensación de que está cubierto sin haber tocado nunca el índice real.
 */
export const createFakePlansRepository = (input: {
  plans?: PlanRow[]
  /** Plan de cada evento, por id de evento. */
  eventPlans?: Record<string, string>
  requests?: PlanChangeRequestRow[]
  /** Extras comprados, por id de evento. */
  extras?: Record<string, ExtraAplicado[]>
}) => {
  const plans = [...(input.plans ?? [])]
  const eventPlans = new Map(Object.entries(input.eventPlans ?? {}))
  const requests = [...(input.requests ?? [])]

  const repository: PlansRepository = {
    async findEventPlan(eventId) {
      const planId = eventPlans.get(eventId)
      return plans.find((p) => p.id === planId) ?? null
    },
    // El orden de `plans` es el del catálogo: el primero es el más barato.
    async findCheapestActivePlan() {
      return plans[0] ?? null
    },
    async updateExtra() {
      return false
    },
    async listExtras() {
      return []
    },
    async applyExtra() {
      return false
    },
    async listEventExtras(eventId) {
      return input.extras?.[eventId] ?? []
    },
    async listActivePlans() {
      return [...plans]
    },
    async findPlanById(planId) {
      return plans.find((p) => p.id === planId) ?? null
    },
    async findPendingRequest(eventId) {
      return requests.find((r) => r.eventId === eventId && r.status === 'pending') ?? null
    },
    async insertRequest(row) {
      requests.push({ ...row, status: 'pending', resolvedAt: null })
    },
    async findRequest(requestId) {
      return requests.find((r) => r.id === requestId) ?? null
    },
    async applyRequest(requestId, at) {
      const index = requests.findIndex((r) => r.id === requestId && r.status === 'pending')
      const found = requests[index]
      if (!found) return false
      requests[index] = { ...found, status: 'applied', resolvedAt: at }
      eventPlans.set(found.eventId, found.requestedPlanId)
      return true
    },
    async rejectRequest(requestId, at) {
      const index = requests.findIndex((r) => r.id === requestId && r.status === 'pending')
      const found = requests[index]
      if (!found) return false
      requests[index] = { ...found, status: 'rejected', resolvedAt: at }
      return true
    },
  }

  return { repository, planDe: (eventId: string) => eventPlans.get(eventId) ?? null, requests }
}

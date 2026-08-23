/** Un plan del catálogo con sus límites, tal y como sale de la base. */
export type PlanRow = {
  readonly id: string
  readonly slug: string
  readonly maxGuestGroups: number | null
  readonly includesSeating: boolean
  readonly includesRegistry: boolean
  readonly includesCheckin: boolean
  /** Precio de una vez, por evento. Es como se vende hoy. */
  readonly priceCents?: number
  /**
   * Precio anual, para el conmutador de la maqueta. Nulo mientras nadie venda el plan por
   * suscripción: el conmutador solo aparece si hay precio anual cargado.
   */
  readonly priceAnnualCents?: number | null
}

export type PlanChangeStatus = 'pending' | 'applied' | 'rejected'

export type PlanChangeRequestRow = {
  readonly id: string
  readonly eventId: string
  readonly requestedPlanId: string
  readonly note: string | null
  readonly status: PlanChangeStatus
  readonly createdAt: Date
  readonly resolvedAt: Date | null
}

/**
 * La parte de solo lectura del catálogo. Va separada porque resolver la capacidad de un
 * evento —lo que hace falta en cada página del panel— no necesita saber nada de
 * solicitudes de cambio.
 */
export interface PlanReader {
  /** El plan del evento, o `null` si el evento no tiene plan o no existe. */
  findEventPlan(eventId: string): Promise<PlanRow | null>
  /** El plan activo más barato. Es el que se aplica a un evento sin plan. */
  findCheapestActivePlan(): Promise<PlanRow | null>
  listActivePlans(): Promise<PlanRow[]>
  findPlanById(planId: string): Promise<PlanRow | null>
}

export interface PlanChangeRequests {
  findPendingRequest(eventId: string): Promise<PlanChangeRequestRow | null>
  insertRequest(row: {
    id: string
    eventId: string
    requestedPlanId: string
    note: string | null
    createdAt: Date
  }): Promise<void>
  findRequest(requestId: string): Promise<PlanChangeRequestRow | null>
  /**
   * Cambia `events.plan_id` y marca la solicitud **en la misma transacción**. Si se
   * cambiara el plan y fallara el marcado, la solicitud quedaría pendiente para siempre
   * sobre un evento que ya cambió, y el atelier volvería a aplicarla.
   *
   * Devuelve `false` si la solicitud ya no estaba pendiente.
   */
  applyRequest(requestId: string, at: Date): Promise<boolean>
  /** Marca la solicitud rechazada. Devuelve `false` si ya no estaba pendiente. */
  rejectRequest(requestId: string, at: Date): Promise<boolean>
}

export interface PlansRepository extends PlanReader, PlanChangeRequests {}

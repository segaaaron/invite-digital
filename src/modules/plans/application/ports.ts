import type { Extra, ExtraAplicado } from '../domain/extras'
/** Un plan del catálogo con sus límites, tal y como sale de la base. */
export type PlanRow = {
  readonly id: string
  readonly slug: string
  readonly maxGuestGroups: number | null
  readonly includesSeating: boolean
  readonly includesRegistry: boolean
  readonly includesCheckin: boolean
  /** Cuántos porteros puede sumar quien compró. Cero: el plan no trae puerta. */
  readonly maxDoorPorters: number
  readonly maxCohosts: number | null
  readonly maxHiredPlanners: number | null
  readonly plannerSuite: string
  readonly maxGalleryPhotos: number | null
  readonly guestPhotos: boolean
  readonly eventPassword: boolean
  readonly csvImport: boolean
  readonly onlineDays: number
  /** Texto de la base; `capacidadDePlan` lo lee con respaldo seguro. */
  readonly designChange: string
  /** Precio de una vez, por evento. Es como se vende hoy. */
  readonly priceCents?: number
  /**
   * Precio anual, para el conmutador de la maqueta. Nulo mientras nadie venda el plan por
   * suscripción: el conmutador solo aparece si hay precio anual cargado.
   */
  readonly priceAnnualCents?: number | null
  /** La reserva de importe fijo, en centavos (`0079`). */
  readonly depositFixedCents?: number | null
  /** La reserva como porcentaje del total (si no hay fija). */
  readonly depositPct?: number | null
  /** Diseño por encargo (`0081`): rondas de corrección y días de entrega. Nulos: autoservicio. */
  readonly correctionRounds?: number | null
  readonly deliveryDays?: number | null
  /** Libro de firmas y formas de regalar (`0084`). */
  readonly includesGuestbook?: boolean
  readonly includesGiftWays?: boolean
  readonly includesStyle?: boolean
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
  /** Los extras que compró el evento, ya aprobados. */
  listEventExtras(eventId: string): Promise<ExtraAplicado[]>
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

export interface PlansRepository extends PlanReader, PlanChangeRequests {
  /**
   * Aplica el extra de un pedido aprobado a su evento. **Una sola vez por pedido**: aprobar dos
   * veces no lo suma dos veces. `false` si ya estaba o el pedido no es de un extra.
   */
  applyExtra(orderId: string): Promise<boolean>
  /**
   * Aplica al evento del pedido los extras que llevaba su cotización. Una vez por evento y extra.
   * Devuelve cuántos aplicó.
   */
  applyQuoteExtras(orderId: string): Promise<number>
  /**
   * Aplica un extra **sin pedido**: el evento sin cliente que lleva el atelier, cuyo cobro va fuera
   * del sistema. Una vez por evento y extra. `false` si ya lo tenía o el extra no existe.
   */
  applyExtraWithoutOrder(eventId: string, addonSlug: string): Promise<boolean>
  /** El catálogo de extras; con `soloActivos`, los que están a la venta. */
  listExtras(soloActivos: boolean): Promise<Extra[]>
  /** Edita un extra. `false` si no existe. */
  updateExtra(slug: string, extra: Omit<Extra, 'slug' | 'currency'>): Promise<boolean>}

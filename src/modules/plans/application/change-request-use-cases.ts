import { attempt, err, ok, type Result } from '@/shared/result'
import { plansError, type PlansError } from '../domain/errors'
import type { PlansRepository } from './ports'

export type PendingRequest = {
  readonly id: string
  readonly requestedPlanId: string
  readonly requestedPlanSlug: string
  readonly note: string | null
  readonly createdAt: Date
}

type Deps = { plans: PlansRepository; ids: () => string; clock: () => Date }

/**
 * Registra una petición de cambio de plan. No hay cobro en línea: el atelier la resuelve
 * fuera del sistema y luego la aplica.
 */
export const requestPlanChange =
  (deps: Deps) =>
  async (input: { eventId: string; requestedPlanId: string; note: string | null }): Promise<Result<PendingRequest, PlansError>> =>
    attempt<PendingRequest, PlansError>(
      async () => {
        const pedido = await deps.plans.findPlanById(input.requestedPlanId)
        if (!pedido) return err(plansError('not_found', 'Ese plan no existe o ya no está activo.'))

        // El plan de hecho, no el de la columna: un evento sin plan ya está en el más
        // barato, y sin esto podría «cambiarse» al que ya se le aplica.
        const actual = (await deps.plans.findEventPlan(input.eventId)) ?? (await deps.plans.findCheapestActivePlan())
        if (actual && actual.id === pedido.id) {
          return err(plansError('same_plan', `El evento ya está en el plan ${pedido.slug}.`))
        }

        const pendiente = await deps.plans.findPendingRequest(input.eventId)
        if (pendiente) {
          return err(plansError('request_already_pending', 'Este evento ya tiene una solicitud de cambio sin resolver.'))
        }

        const id = deps.ids()
        const createdAt = deps.clock()
        await deps.plans.insertRequest({
          id,
          eventId: input.eventId,
          requestedPlanId: pedido.id,
          note: input.note,
          createdAt,
        })

        return ok({ id, requestedPlanId: pedido.id, requestedPlanSlug: pedido.slug, note: input.note, createdAt })
      },
      // Aquí cae también el choque contra el índice único parcial. La comprobación de
      // arriba es la cortés; la que de verdad impide dos solicitudes pendientes es el
      // índice, porque entre leer y escribir cabe otra pestaña del panel.
      (cause) => plansError('storage_failure', `No se pudo registrar la solicitud: ${String(cause)}`),
    )

/** Aplica la solicitud: cambia el plan del evento y la marca, en la misma transacción. */
export const applyPlanChange =
  (deps: Deps) =>
  async (requestId: string): Promise<Result<{ eventId: string; planId: string }, PlansError>> =>
    attempt<{ eventId: string; planId: string }, PlansError>(
      async () => {
        const solicitud = await deps.plans.findRequest(requestId)
        if (!solicitud) return err(plansError('not_found', 'Esa solicitud no existe.'))
        if (solicitud.status !== 'pending') {
          return err(plansError('already_resolved', `Esa solicitud ya está ${solicitud.status}.`))
        }

        const aplicada = await deps.plans.applyRequest(requestId, deps.clock())
        // Falso si otra pestaña se adelantó entre la lectura de arriba y este UPDATE.
        if (!aplicada) return err(plansError('already_resolved', 'Esa solicitud ya estaba resuelta.'))

        return ok({ eventId: solicitud.eventId, planId: solicitud.requestedPlanId })
      },
      (cause) => plansError('storage_failure', `No se pudo aplicar la solicitud: ${String(cause)}`),
    )

/** Rechaza la solicitud sin tocar el plan del evento. */
export const rejectPlanChange =
  (deps: Deps) =>
  async (requestId: string): Promise<Result<null, PlansError>> =>
    attempt<null, PlansError>(
      async () => {
        const solicitud = await deps.plans.findRequest(requestId)
        if (!solicitud) return err(plansError('not_found', 'Esa solicitud no existe.'))

        const rechazada = await deps.plans.rejectRequest(requestId, deps.clock())
        if (!rechazada) return err(plansError('already_resolved', 'Esa solicitud ya estaba resuelta.'))

        return ok(null)
      },
      (cause) => plansError('storage_failure', `No se pudo rechazar la solicitud: ${String(cause)}`),
    )

/** La solicitud sin resolver del evento, si la hay, con el nombre del plan pedido. */
export const getPendingRequest =
  (deps: { plans: PlansRepository }) =>
  async (eventId: string): Promise<Result<PendingRequest | null, PlansError>> =>
    attempt<PendingRequest | null, PlansError>(
      async () => {
        const solicitud = await deps.plans.findPendingRequest(eventId)
        if (!solicitud) return ok(null)

        const pedido = await deps.plans.findPlanById(solicitud.requestedPlanId)

        return ok({
          id: solicitud.id,
          requestedPlanId: solicitud.requestedPlanId,
          // Un plan retirado del catálogo sigue teniendo solicitudes apuntándole. Se
          // enseña el identificador antes que un hueco.
          requestedPlanSlug: pedido?.slug ?? solicitud.requestedPlanId,
          note: solicitud.note,
          createdAt: solicitud.createdAt,
        })
      },
      (cause) => plansError('storage_failure', `No se pudo leer la solicitud: ${String(cause)}`),
    )

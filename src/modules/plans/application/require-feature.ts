import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { type Allowance, hasFeature, type PlanFeature, planThatIncludes } from '../domain/allowance'
import { plansError, type PlansError } from '../domain/errors'
import { getEventAllowance } from './get-event-allowance'
import { capacidadDePlan } from './plan-capacity'
import type { PlanReader } from './ports'

const NOMBRE: Record<PlanFeature, string> = {
  seating: 'el plano del salón',
  registry: 'la mesa de regalos',
  checkin: 'el modo puerta',
  guestPhotos: 'las fotos de los invitados',
  eventPassword: 'la invitación con contraseña',
  csvImport: 'importar la lista de invitados',
}

const desdeFila = capacidadDePlan

/**
 * Puerta de las funciones que un plan incluye o no. Devuelve la capacidad si la trae y
 * `feature_not_included` si no.
 *
 * Va en la capa de acciones de `venue`, `registry` y `checkin`, no en el dominio de esos
 * módulos: que la mesa de regalos venga con un plan y no con otro es una decisión
 * comercial, y no tiene nada que ver con las reglas de un regalo ni de una mesa.
 */
export const requireFeature =
  (deps: { plans: PlanReader }) =>
  async (eventId: string, feature: PlanFeature): Promise<Result<Allowance, PlansError>> =>
    attempt<Allowance, PlansError>(
      async () => {
        const allowance = await getEventAllowance(deps)(eventId)
        if (isErr(allowance)) return allowance
        if (hasFeature(allowance.value, feature)) return ok(allowance.value)

        // Qué plan sí la trae. Sin esto el rechazo deja al atelier sin salida: sabe que
        // no puede, pero no a qué plan tiene que subir al cliente.
        const catalogo = (await deps.plans.listActivePlans()).map(desdeFila)
        const conLaFuncion = planThatIncludes(feature, catalogo)

        return err(
          plansError(
            'feature_not_included',
            conLaFuncion === null
              ? `El plan ${allowance.value.planSlug} no incluye ${NOMBRE[feature]}.`
              : `El plan ${allowance.value.planSlug} no incluye ${NOMBRE[feature]}; lo trae el plan ${conLaFuncion}.`,
          ),
        )
      },
      (cause) => plansError('storage_failure', `No se pudo comprobar el plan del evento: ${String(cause)}`),
    )

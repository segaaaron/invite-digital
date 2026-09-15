import { attempt, ok, type Result } from '@/shared/result'
import type { Allowance } from '../domain/allowance'
import { plansError, type PlansError } from '../domain/errors'
import { capacidadDePlan } from './plan-capacity'
import type { PlanReader } from './ports'

/**
 * Lo que se aplica cuando el catálogo no tiene ni un plan activo. Es permisiva a
 * propósito: un catálogo vacío es un fallo de datos, y castigarlo cerrando el panel de
 * todas las bodas en marcha convierte un problema de configuración en una caída.
 */
const SIN_PLAN: Allowance = {
  planSlug: 'sin-plan',
  maxGuestGroups: null,
  seating: true,
  registry: true,
  checkin: true,
  maxDoorPorters: 10,
  maxGalleryPhotos: null,
  guestPhotos: true,
  eventPassword: true,
  csvImport: true,
  onlineDays: 365,
  designChange: 'siempre',
}

const desdeFila = capacidadDePlan

/**
 * La capacidad de un evento, ya resuelta. Quien aplica un límite recibe esto y no sabe
 * nada de planes: así `guests`, `venue`, `registry` y `checkin` siguen sin depender de
 * una regla comercial que va a cambiar.
 */
export const getEventAllowance =
  (deps: { plans: PlanReader }) =>
  async (eventId: string): Promise<Result<Allowance, PlansError>> =>
    attempt<Allowance, PlansError>(
      async () => {
        const propio = await deps.plans.findEventPlan(eventId)
        if (propio) return ok(desdeFila(propio))

        // Un evento sin plan se trata como el más barato activo. Los creados antes de
        // esta rebanada no tienen ninguno y no pueden quedar en un limbo donde todo
        // esté prohibido.
        const masBarato = await deps.plans.findCheapestActivePlan()
        if (masBarato) return ok(desdeFila(masBarato))

        console.warn('no hay ningún plan activo en el catálogo; se aplica capacidad permisiva', eventId)
        return ok(SIN_PLAN)
      },
      (cause) => plansError('storage_failure', `No se pudo leer el plan del evento: ${String(cause)}`),
    )

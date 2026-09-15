import { DESIGN_CHANGES, PLANNER_SUITES, type Allowance, type DesignChange, type PlannerSuite } from '../domain/allowance'
import type { PlanRow } from './ports'

/**
 * De la fila del plan a lo que ese plan permite. **Una sola vez**: estaba copiada en la
 * capacidad del evento, en la puerta de funciones y en la página del plan, y cada columna
 * nueva había que acordarse de añadirla en tres sitios.
 *
 * Un `design_change` desconocido cae a `ninguno`: una regla que no se reconoce no concede.
 */
export const capacidadDePlan = (row: PlanRow): Allowance => ({
  planSlug: row.slug,
  maxGuestGroups: row.maxGuestGroups,
  seating: row.includesSeating,
  registry: row.includesRegistry,
  checkin: row.includesCheckin,
  maxDoorPorters: row.maxDoorPorters,
  maxCohosts: row.maxCohosts,
  maxHiredPlanners: row.maxHiredPlanners,
  maxGalleryPhotos: row.maxGalleryPhotos,
  guestPhotos: row.guestPhotos,
  eventPassword: row.eventPassword,
  csvImport: row.csvImport,
  onlineDays: row.onlineDays,
  plannerSuite: (PLANNER_SUITES as readonly string[]).includes(row.plannerSuite) ? (row.plannerSuite as PlannerSuite) : 'esencial',
  designChange: (DESIGN_CHANGES as readonly string[]).includes(row.designChange) ? (row.designChange as DesignChange) : 'ninguno',
})

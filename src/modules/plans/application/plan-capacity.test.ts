import { describe, expect, it } from 'vitest'
import { capacidadDePlan } from './plan-capacity'
import type { PlanRow } from './ports'

const fila: PlanRow = {
  id: 'p1',
  slug: 'firma-3d',
  maxGuestGroups: 80,
  includesSeating: true,
  includesRegistry: true,
  includesCheckin: true,
  maxDoorPorters: 3,
  maxCohosts: 1,
  maxHiredPlanners: 0,
  maxGalleryPhotos: 20,
  guestPhotos: true,
  eventPassword: true,
  csvImport: true,
  onlineDays: 180,
  designChange: 'antes_de_repartir',
}

describe('capacidadDePlan', () => {
  it('pasa cada columna del plan a la capacidad', () => {
    expect(capacidadDePlan(fila)).toEqual({
      planSlug: 'firma-3d',
      maxGuestGroups: 80,
      seating: true,
      registry: true,
      checkin: true,
      maxDoorPorters: 3,
      maxCohosts: 1,
      maxHiredPlanners: 0,
      maxGalleryPhotos: 20,
      guestPhotos: true,
      eventPassword: true,
      csvImport: true,
      onlineDays: 180,
      designChange: 'antes_de_repartir',
    })
  })

  it('una regla de cambio de modelo desconocida no concede nada', () => {
    expect(capacidadDePlan({ ...fila, designChange: 'cuando-quiera' }).designChange).toBe('ninguno')
  })
})

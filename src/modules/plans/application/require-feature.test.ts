import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createFakePlansRepository } from './fake-plans-repository'
import type { PlanRow } from './ports'
import { requireFeature } from './require-feature'

const atelier: PlanRow = {
  id: 'plan-atelier',
  slug: 'atelier',
  maxGuestGroups: 30,
  includesSeating: true,
  includesRegistry: false,
  includesCheckin: false,
  maxDoorPorters: 0,
  maxGalleryPhotos: 8,
  guestPhotos: false,
  eventPassword: false,
  csvImport: false,
  onlineDays: 60,
  designChange: 'ninguno',
}

const firma: PlanRow = {
  id: 'plan-firma-3d',
  slug: 'firma-3d',
  maxGuestGroups: 80,
  includesSeating: true,
  includesRegistry: true,
  includesCheckin: true,
  maxDoorPorters: 10,
  maxGalleryPhotos: null,
  guestPhotos: true,
  eventPassword: true,
  csvImport: true,
  onlineDays: 365,
  designChange: 'siempre',
}

const catalogo = [atelier, firma]

const conPlan = (planId: string) =>
  createFakePlansRepository({ plans: catalogo, eventPlans: { 'evento-1': planId } }).repository

describe('requireFeature', () => {
  it('con la función incluida devuelve la capacidad', async () => {
    const result = await requireFeature({ plans: conPlan('plan-firma-3d') })('evento-1', 'registry')

    expect(isOk(result) && result.value.planSlug).toBe('firma-3d')
  })

  it('sin la función incluida rechaza con feature_not_included', async () => {
    const result = await requireFeature({ plans: conPlan('plan-atelier') })('evento-1', 'registry')

    expect(isErr(result) && result.error.kind).toBe('feature_not_included')
  })

  it('el rechazo dice qué plan sí la trae, para que se pueda hacer algo con él', async () => {
    // «No incluido» a secas deja al atelier sin salida: tiene que poder decirle al
    // cliente a qué plan subir.
    const result = await requireFeature({ plans: conPlan('plan-atelier') })('evento-1', 'checkin')

    expect(isErr(result) && result.error.detail).toContain('firma-3d')
  })

  it('si ningún plan del catálogo la trae, el rechazo no inventa un plan', async () => {
    const sinNinguno = createFakePlansRepository({
      plans: [atelier],
      eventPlans: { 'evento-1': 'plan-atelier' },
    }).repository

    const result = await requireFeature({ plans: sinNinguno })('evento-1', 'registry')

    expect(isErr(result) && result.error.kind).toBe('feature_not_included')
    expect(isErr(result) && result.error.detail).not.toContain('undefined')
  })

  it('un evento sin plan se juzga por el plan más barato activo', async () => {
    const sinPlan = createFakePlansRepository({ plans: catalogo }).repository

    // El más barato es `atelier`, que no trae mesa de regalos.
    const regalos = await requireFeature({ plans: sinPlan })('evento-huerfano', 'registry')
    expect(isErr(regalos) && regalos.error.kind).toBe('feature_not_included')

    // Pero sí trae el salón: un evento sin plan no queda en un limbo donde todo esté
    // prohibido.
    const mesas = await requireFeature({ plans: sinPlan })('evento-huerfano', 'seating')
    expect(isOk(mesas)).toBe(true)
  })
})

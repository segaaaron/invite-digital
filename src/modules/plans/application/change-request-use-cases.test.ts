import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { applyPlanChange, getPendingRequest, requestPlanChange } from './change-request-use-cases'
import { createFakePlansRepository } from './fake-plans-repository'
import type { PlanRow } from './ports'

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

const NOW = new Date('2026-08-21T12:00:00.000Z')
const deps = (repository: ReturnType<typeof createFakePlansRepository>['repository']) => ({
  plans: repository,
  ids: () => 'sol-1',
  clock: () => NOW,
})

const conEvento = (planId: string | null) =>
  createFakePlansRepository({
    plans: [atelier, firma],
    ...(planId === null ? {} : { eventPlans: { 'evento-1': planId } }),
  })

describe('requestPlanChange', () => {
  it('registra la solicitud pendiente', async () => {
    const { repository, requests } = conEvento('plan-atelier')

    const result = await requestPlanChange(deps(repository))({
      eventId: 'evento-1',
      requestedPlanId: 'plan-firma-3d',
      note: 'La lista creció.',
    })

    expect(isOk(result)).toBe(true)
    expect(requests).toEqual([
      {
        id: 'sol-1',
        eventId: 'evento-1',
        requestedPlanId: 'plan-firma-3d',
        note: 'La lista creció.',
        status: 'pending',
        createdAt: NOW,
        resolvedAt: null,
      },
    ])
  })

  it('pedir el plan que ya se tiene da same_plan', async () => {
    const { repository } = conEvento('plan-atelier')

    const result = await requestPlanChange(deps(repository))({
      eventId: 'evento-1',
      requestedPlanId: 'plan-atelier',
      note: null,
    })

    expect(isErr(result) && result.error.kind).toBe('same_plan')
  })

  it('un evento sin plan ya está en el más barato: pedirlo también da same_plan', async () => {
    // Sin esto, el atelier podría «cambiar» un evento sin plan al plan que ya se le
    // aplica de hecho, y la solicitud no significaría nada.
    const { repository } = conEvento(null)

    const result = await requestPlanChange(deps(repository))({
      eventId: 'evento-1',
      requestedPlanId: 'plan-atelier',
      note: null,
    })

    expect(isErr(result) && result.error.kind).toBe('same_plan')
  })

  it('una segunda solicitud pendiente da request_already_pending', async () => {
    const { repository } = conEvento('plan-atelier')
    await requestPlanChange(deps(repository))({ eventId: 'evento-1', requestedPlanId: 'plan-firma-3d', note: null })

    const segunda = await requestPlanChange({ ...deps(repository), ids: () => 'sol-2' })({
      eventId: 'evento-1',
      requestedPlanId: 'plan-firma-3d',
      note: null,
    })

    expect(isErr(segunda) && segunda.error.kind).toBe('request_already_pending')
  })

  it('un plan que no existe o no está activo da not_found', async () => {
    const { repository } = conEvento('plan-atelier')

    const result = await requestPlanChange(deps(repository))({
      eventId: 'evento-1',
      requestedPlanId: 'plan-inventado',
      note: null,
    })

    expect(isErr(result) && result.error.kind).toBe('not_found')
  })
})

describe('applyPlanChange', () => {
  it('cambia el plan del evento y marca la solicitud', async () => {
    const { repository, planDe } = conEvento('plan-atelier')
    await requestPlanChange(deps(repository))({ eventId: 'evento-1', requestedPlanId: 'plan-firma-3d', note: null })

    const result = await applyPlanChange(deps(repository))('sol-1')

    expect(isOk(result)).toBe(true)
    expect(planDe('evento-1')).toBe('plan-firma-3d')
    expect((await repository.findRequest('sol-1'))?.status).toBe('applied')
  })

  it('aplicar una ya resuelta da already_resolved', async () => {
    const { repository } = conEvento('plan-atelier')
    await requestPlanChange(deps(repository))({ eventId: 'evento-1', requestedPlanId: 'plan-firma-3d', note: null })
    await applyPlanChange(deps(repository))('sol-1')

    const segunda = await applyPlanChange(deps(repository))('sol-1')

    expect(isErr(segunda) && segunda.error.kind).toBe('already_resolved')
  })

  it('una solicitud que no existe da not_found', async () => {
    const { repository } = conEvento('plan-atelier')

    const result = await applyPlanChange(deps(repository))('sol-fantasma')

    expect(isErr(result) && result.error.kind).toBe('not_found')
  })
})

describe('getPendingRequest', () => {
  it('devuelve null cuando no hay ninguna', async () => {
    const { repository } = conEvento('plan-atelier')

    const result = await getPendingRequest({ plans: repository })('evento-1')

    expect(isOk(result) && result.value).toBeNull()
  })

  it('devuelve la pendiente con el plan pedido', async () => {
    const { repository } = conEvento('plan-atelier')
    await requestPlanChange(deps(repository))({ eventId: 'evento-1', requestedPlanId: 'plan-firma-3d', note: null })

    const result = await getPendingRequest({ plans: repository })('evento-1')

    expect(isOk(result) && result.value?.requestedPlanSlug).toBe('firma-3d')
  })
})

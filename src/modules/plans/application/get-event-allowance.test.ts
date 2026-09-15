import { afterEach, describe, expect, it, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createFakePlansRepository } from './fake-plans-repository'
import { getEventAllowance } from './get-event-allowance'
import type { PlanRow } from './ports'

const atelier: PlanRow = {
  id: 'plan-atelier',
  slug: 'atelier',
  maxGuestGroups: 30,
  includesSeating: true,
  includesRegistry: false,
  includesCheckin: false,
  maxDoorPorters: 0,
  maxCohosts: 1,
  maxHiredPlanners: 0,
  maxGalleryPhotos: 8,
  guestPhotos: false,
  eventPassword: false,
  csvImport: false,
  onlineDays: 60,
  designChange: 'ninguno',
  plannerSuite: 'esencial',
}

const altaCostura: PlanRow = {
  id: 'plan-alta-costura',
  slug: 'alta-costura',
  maxGuestGroups: null,
  includesSeating: true,
  includesRegistry: true,
  includesCheckin: true,
  maxDoorPorters: 10,
  maxCohosts: 1,
  maxHiredPlanners: 0,
  maxGalleryPhotos: null,
  guestPhotos: true,
  eventPassword: true,
  csvImport: true,
  onlineDays: 365,
  designChange: 'siempre',
  plannerSuite: 'esencial',
}

// El catálogo llega ordenado por precio: el primero es el más barato.
const catalogo = [atelier, altaCostura]

afterEach(() => vi.restoreAllMocks())

describe('getEventAllowance', () => {
  it('un evento con plan devuelve los límites de ese plan', async () => {
    const { repository } = createFakePlansRepository({
      plans: catalogo,
      eventPlans: { 'evento-1': 'plan-alta-costura' },
    })

    const result = await getEventAllowance({ plans: repository })('evento-1')

    expect(isOk(result) && result.value).toEqual({
      planSlug: 'alta-costura',
      maxGuestGroups: null,
      seating: true,
      registry: true,
      checkin: true,
      maxDoorPorters: 10,
      maxCohosts: 1,
      maxHiredPlanners: 0,
      maxGalleryPhotos: null,
      guestPhotos: true,
      eventPassword: true,
      csvImport: true,
      onlineDays: 365,
      designChange: 'siempre',
      plannerSuite: 'esencial',
    })
  })

  it('un evento SIN plan usa el plan más barato activo', async () => {
    // Los eventos creados antes de esta rebanada no tienen plan. No pueden quedar en un
    // limbo donde todo esté prohibido: el panel entero se les cerraría de golpe.
    const { repository } = createFakePlansRepository({ plans: catalogo })

    const result = await getEventAllowance({ plans: repository })('evento-sin-plan')

    expect(isOk(result) && result.value.planSlug).toBe('atelier')
    expect(isOk(result) && result.value.maxGuestGroups).toBe(30)
    expect(isOk(result) && result.value.registry).toBe(false)
    expect(isOk(result) && result.value.maxDoorPorters).toBe(0)
  })

  it('sin ningún plan activo la capacidad es permisiva y queda registrado', async () => {
    // Un catálogo vacío es un fallo de datos, no un motivo para bloquear el panel de
    // todas las bodas en marcha. Se abre y se avisa por consola para que se note.
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { repository } = createFakePlansRepository({ plans: [] })

    const result = await getEventAllowance({ plans: repository })('evento-1')

    expect(isOk(result) && result.value).toEqual({
      planSlug: 'sin-plan',
      maxGuestGroups: null,
      seating: true,
      registry: true,
      checkin: true,
      maxDoorPorters: 10,
      maxCohosts: null,
      maxHiredPlanners: null,
      maxGalleryPhotos: null,
      guestPhotos: true,
      eventPassword: true,
      csvImport: true,
      onlineDays: 365,
      designChange: 'siempre',
      plannerSuite: 'total',
    })
    expect(aviso).toHaveBeenCalled()
  })

  it('si la base no responde devuelve storage_failure, no revienta la página', async () => {
    const { repository } = createFakePlansRepository({ plans: catalogo })
    const roto = {
      ...repository,
      findEventPlan: () => Promise.reject(new Error('conexión caída')),
    }

    const result = await getEventAllowance({ plans: roto })('evento-1')

    expect(isErr(result) && result.error.kind).toBe('storage_failure')
  })
})

describe('los extras que compró el evento', () => {
  it('suben la capacidad del plan del evento', async () => {
    const { repository: repo } = createFakePlansRepository({ plans: [atelier], eventPlans: { e1: 'plan-atelier' }, extras: { e1: [{ effect: 'mas_grupos', amount: 40 }, { effect: 'fotos_invitados', amount: 0 }] } })
    const r = await getEventAllowance({ plans: repo })('e1')
    expect(isOk(r) && r.value).toMatchObject({ maxGuestGroups: 70, guestPhotos: true })
  })

  it('también sobre el plan más barato de un evento sin plan', async () => {
    const { repository: repo } = createFakePlansRepository({ plans: [atelier], extras: { e2: [{ effect: 'mas_porteros', amount: 3 }] } })
    const r = await getEventAllowance({ plans: repo })('e2')
    expect(isOk(r) && r.value).toMatchObject({ maxDoorPorters: 3, checkin: true })
  })
})


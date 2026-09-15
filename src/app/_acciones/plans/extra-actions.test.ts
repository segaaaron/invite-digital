import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/result'
import type { Allowance } from '@/modules/plans/domain/allowance'

const placeAddon = vi.fn()
const allowanceFor = vi.fn()
const redirect = vi.fn<(url: string) => never>(() => {
  throw new Error('NEXT_REDIRECT')
})

vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }))
// La guardia se deja pasar: que esté puesta lo vigilan `pnpm verify:tenancy` y las e2e.
vi.mock('@/app/_acciones/sesion', () => ({
  requireSession: async () => ({ userId: 'u1', email: 'ana@x.bo' }),
  requireEventAccess: async () => {},
}))
vi.mock('@/app/composition/container', () => ({
  orders: { placeAddon: (...args: unknown[]) => placeAddon(...args) },
  plans: {
    allowanceFor: (...args: unknown[]) => allowanceFor(...args),
    listActiveExtras: async () => [{ slug: 'dia-d', name: 'Día D', priceCents: 15000, currency: 'BOB', effect: 'dia_d', amount: 0, isActive: true }],
  },
}))

const capacidad = (plannerSuite: Allowance['plannerSuite']): Allowance => ({
  planSlug: 'x',
  maxGuestGroups: 40,
  seating: true,
  registry: false,
  checkin: false,
  maxDoorPorters: 0,
  maxCohosts: 1,
  maxHiredPlanners: 0,
  maxGalleryPhotos: 8,
  guestPhotos: false,
  eventPassword: false,
  csvImport: false,
  onlineDays: 60,
  designChange: 'ninguno',
  plannerSuite,
})

const form = (addonSlug: string): FormData => {
  const fd = new FormData()
  fd.set('eventId', 'e1')
  fd.set('eventSlug', 'boda')
  fd.set('addonSlug', addonSlug)
  return fd
}

beforeEach(() => vi.clearAllMocks())

describe('orderExtraAction', () => {
  it('un evento Atelier no compra el Día D ni por POST: se llevaría proveedores y cronograma', async () => {
    allowanceFor.mockResolvedValue(ok(capacidad('esencial')))
    const { orderExtraAction } = await import('@/app/_acciones/plans/extra-actions')

    const r = await orderExtraAction({ status: 'idle' }, form('dia-d'))
    expect(r.status).toBe('error')
    expect(placeAddon).not.toHaveBeenCalled()
  })

  it('quien ya lo tiene no lo vuelve a comprar', async () => {
    allowanceFor.mockResolvedValue(ok(capacidad('total')))
    const { orderExtraAction } = await import('@/app/_acciones/plans/extra-actions')

    expect((await orderExtraAction({ status: 'idle' }, form('dia-d'))).status).toBe('error')
    expect(placeAddon).not.toHaveBeenCalled()
  })

  it('un extra que no está a la venta no se pide', async () => {
    allowanceFor.mockResolvedValue(ok(capacidad('completo')))
    const { orderExtraAction } = await import('@/app/_acciones/plans/extra-actions')

    expect((await orderExtraAction({ status: 'idle' }, form('inventado'))).status).toBe('error')
    expect(placeAddon).not.toHaveBeenCalled()
  })

  it('Firma 3D lo pide y va a su pedido', async () => {
    allowanceFor.mockResolvedValue(ok(capacidad('completo')))
    placeAddon.mockResolvedValue(ok({ publicRef: 'ABCDEFGH' }))
    const { orderExtraAction } = await import('@/app/_acciones/plans/extra-actions')

    await expect(orderExtraAction({ status: 'idle' }, form('dia-d'))).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/es/pedido/ref/ABCDEFGH')
  })
})

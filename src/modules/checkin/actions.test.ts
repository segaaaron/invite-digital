import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { checkinError } from './domain/errors'

/**
 * Deshacer una llegada que no se deshace es de las peores: el contador de la puerta
 * miente el resto de la noche y nadie se entera hasta que se cierra el salón.
 */
const voidArrival = vi.fn()
const adjust = vi.fn()
const requireFeature = vi.fn()
const requireSession = vi.fn().mockResolvedValue({ userId: 'u1' })

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/modules/identity/session-cookie', () => ({ requireSession: () => requireSession() }))
vi.mock('@/app/composition/container', () => ({
  checkin: {
    void: (...args: unknown[]) => voidArrival(...args),
    adjust: (...args: unknown[]) => adjust(...args),
    record: vi.fn(),
    recordGroup: vi.fn(),
  },
  plans: { requireFeature: (...args: unknown[]) => requireFeature(...args) },
}))

const entrada = { eventId: 'e1', scanId: 's1', eventSlug: 'boda' }

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue({ userId: 'u1' })
  requireFeature.mockResolvedValue(
    ok({ planSlug: 'alta-costura', maxGuestGroups: null, seating: true, registry: true, checkin: true }),
  )
})

describe('voidArrivalAction', () => {
  it('deshecha de verdad, devuelve éxito', async () => {
    voidArrival.mockResolvedValue(ok(undefined))
    const { voidArrivalAction } = await import('./actions')

    expect(await voidArrivalAction(entrada)).toEqual({ status: 'success' })
  })

  it('si el caso de uso rechaza, lo devuelve en vez de callárselo', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    voidArrival.mockResolvedValue(err(checkinError('not_found', 'No existe el escaneo s1.')))
    const { voidArrivalAction } = await import('./actions')

    expect(await voidArrivalAction(entrada)).toEqual({ status: 'error', kind: 'not_found' })
    expect(spy).toHaveBeenCalledWith('deshacer rechazado', 'not_found', 'No existe el escaneo s1.')
    spy.mockRestore()
  })
})

describe('adjustArrivalAction', () => {
  it('corregida de verdad, devuelve éxito', async () => {
    adjust.mockResolvedValue(ok(undefined))
    const { adjustArrivalAction } = await import('./actions')

    expect(await adjustArrivalAction({ ...entrada, arrivedCount: 3 })).toEqual({ status: 'success' })
  })

  it('si la corrección se rechaza, la acción lo dice: el contador quedaría mal si no', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    adjust.mockResolvedValue(err(checkinError('storage_failure', 'La base no responde.')))
    const { adjustArrivalAction } = await import('./actions')

    expect(await adjustArrivalAction({ ...entrada, arrivedCount: 3 })).toEqual({
      status: 'error',
      kind: 'storage_failure',
    })
    spy.mockRestore()
  })
})

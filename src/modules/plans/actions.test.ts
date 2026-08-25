import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { plansError } from './domain/errors'

const applyChange = vi.fn()
const rejectChange = vi.fn()
const requireSession = vi.fn().mockResolvedValue({ userId: 'u1' })

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// La guardia de multitenencia se deja pasar en estas pruebas: lo que comprueban es el
// comportamiento de la acción, y que la guardia esté puesta lo vigila `pnpm verify:tenancy`
// y la e2e con dos usuarios de verdad.
vi.mock('@/modules/identity/session-cookie', () => ({
  requireSession: () => requireSession(),
  requireEventAccess: async () => {},
}))
vi.mock('@/app/composition/container', () => ({
  plans: {
    applyChange: (...args: unknown[]) => applyChange(...args),
    rejectChange: (...args: unknown[]) => rejectChange(...args),
    requestChange: vi.fn(),
  },
}))

const form = (): FormData => {
  const fd = new FormData()
  fd.set('requestId', 'r1')
  fd.set('eventSlug', 'boda')
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue({ userId: 'u1' })
})

describe('applyPlanChangeAction', () => {
  it('aplicado de verdad, devuelve éxito', async () => {
    applyChange.mockResolvedValue(ok(undefined))
    const { applyPlanChangeAction } = await import('./actions')

    expect(await applyPlanChangeAction({ status: 'idle' }, form())).toEqual({ status: 'success' })
  })

  it('si el caso de uso rechaza, la acción lo devuelve en vez de fingir que se aplicó', async () => {
    // Sin esto, el atelier cree que el evento ya está en el plan nuevo y le sigue
    // faltando el cupo por el que cobró.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    applyChange.mockResolvedValue(err(plansError('already_resolved', 'La solicitud r1 ya estaba resuelta.')))
    const { applyPlanChangeAction } = await import('./actions')

    expect(await applyPlanChangeAction({ status: 'idle' }, form())).toEqual({
      status: 'error',
      kind: 'already_resolved',
    })
    expect(spy).toHaveBeenCalledWith('cambio de plan no aplicado', 'already_resolved', 'La solicitud r1 ya estaba resuelta.')
    spy.mockRestore()
  })
})

describe('rejectPlanChangeAction', () => {
  it('descartada de verdad, devuelve éxito', async () => {
    rejectChange.mockResolvedValue(ok(undefined))
    const { rejectPlanChangeAction } = await import('./actions')

    expect(await rejectPlanChangeAction({ status: 'idle' }, form())).toEqual({ status: 'success' })
  })

  it('si no se pudo descartar, lo dice', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rejectChange.mockResolvedValue(err(plansError('storage_failure', 'La base no responde.')))
    const { rejectPlanChangeAction } = await import('./actions')

    expect(await rejectPlanChangeAction({ status: 'idle' }, form())).toEqual({
      status: 'error',
      kind: 'storage_failure',
    })
    spy.mockRestore()
  })
})

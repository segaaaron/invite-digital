import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/result'

/**
 * Las dos acciones del invitado sobre la mesa de regalos son extremos públicos: con el
 * enlace se pueden llamar sin abrir la página. Si el evento está protegido con
 * contraseña, tienen que quedarse fuera igual que el render.
 */

const claim = vi.fn()
const resolveByToken = vi.fn()
const requireFeature = vi.fn()
const eventUnlocked = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
// La guardia de multitenencia se deja pasar en estas pruebas: lo que comprueban es el
// comportamiento de la acción, y que la guardia esté puesta lo vigila `pnpm verify:tenancy`
// y la e2e con dos usuarios de verdad.
vi.mock('@/app/_acciones/sesion', () => ({ requireSession: vi.fn(), requireEventAccess: async () => {} }))
vi.mock('@/app/composition/container', () => ({
  registry: { claim: (...args: unknown[]) => claim(...args), release: vi.fn() },
  guests: { resolveByToken: (...args: unknown[]) => resolveByToken(...args) },
  plans: { requireFeature: (...args: unknown[]) => requireFeature(...args) },
}))
vi.mock('@/app/_acciones/events/actions', () => ({ eventUnlocked: (...args: unknown[]) => eventUnlocked(...args) }))

beforeEach(() => {
  vi.clearAllMocks()
  resolveByToken.mockResolvedValue(ok({ id: 'g1', eventId: 'e1' }))
  requireFeature.mockResolvedValue(ok(true))
  claim.mockResolvedValue(ok(true))
})

describe('claimGiftAction con un evento protegido', () => {
  it('sin desbloquear no reserva nada', async () => {
    eventUnlocked.mockResolvedValue(false)
    const { claimGiftAction } = await import('@/app/_acciones/registry/actions')

    const result = await claimGiftAction({ token: 'tok', giftId: 'r1' })

    expect(result.ok).toBe(false)
    expect(claim).not.toHaveBeenCalled()
  })

  it('desbloqueado reserva con normalidad', async () => {
    eventUnlocked.mockResolvedValue(true)
    const { claimGiftAction } = await import('@/app/_acciones/registry/actions')

    await claimGiftAction({ token: 'tok', giftId: 'r1' })

    expect(claim).toHaveBeenCalled()
  })
})

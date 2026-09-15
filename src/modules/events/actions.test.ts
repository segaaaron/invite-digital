import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { eventError } from './domain/errors'

const revokeShare = vi.fn()
const setPassword = vi.fn()
const requireFeature = vi.fn()
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
  events: {
    revokeShare: (...args: unknown[]) => revokeShare(...args),
    create: vi.fn(),
    update: vi.fn(),
    createShare: vi.fn(),
    setPassword: (...args: unknown[]) => setPassword(...args),
  },
  plans: { requireFeature: (...args: unknown[]) => requireFeature(...args) },
  guests: {},
}))

const form = (): FormData => {
  const fd = new FormData()
  fd.set('shareId', 's1')
  fd.set('eventSlug', 'boda')
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue({ userId: 'u1' })
})

describe('revokeClientShareAction', () => {
  it('revocado de verdad, devuelve éxito', async () => {
    revokeShare.mockResolvedValue(ok(undefined))
    const { revokeClientShareAction } = await import('./actions')

    expect(await revokeClientShareAction({ status: 'idle' }, form())).toEqual({ status: 'success' })
  })

  it('si el caso de uso rechaza, devuelve error en vez de fingir que se revocó', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    revokeShare.mockResolvedValue(err(eventError('storage_failure', 'La base no responde.')))
    const { revokeClientShareAction } = await import('./actions')

    expect(await revokeClientShareAction({ status: 'idle' }, form())).toEqual({ status: 'error' })
    // El registro del servidor se conserva: sigue siendo por donde se diagnostica.
    expect(spy).toHaveBeenCalledWith('revocación de enlace rechazada', 'storage_failure', 'La base no responde.')
    spy.mockRestore()
  })

  it('exige sesión', async () => {
    revokeShare.mockResolvedValue(ok(undefined))
    const { revokeClientShareAction } = await import('./actions')

    await revokeClientShareAction({ status: 'idle' }, form())
    expect(requireSession).toHaveBeenCalled()
  })
})

describe('setEventPrivacyAction y el plan', () => {
  const privacidad = (tipo: 'password' | 'public'): FormData => {
    const fd = new FormData()
    fd.set('eventId', 'e1')
    fd.set('eventSlug', 'boda')
    fd.set('privacy', tipo)
    fd.set('password', 'clave-de-la-boda')
    return fd
  }

  it('sin la contraseña en el plan no la pone, aunque llegue por POST', async () => {
    requireFeature.mockResolvedValue(err({ kind: 'feature_not_included', detail: 'Tu plan no incluye la invitación con contraseña.' }))
    const { setEventPrivacyAction } = await import('./actions')

    const r = await setEventPrivacyAction({ status: 'idle' }, privacidad('password'))

    expect(r).toEqual({ status: 'error', message: 'Tu plan no incluye la invitación con contraseña.' })
    expect(setPassword).not.toHaveBeenCalled()
  })

  it('quitarla siempre se puede: dejar la invitación pública no es una función de pago', async () => {
    requireFeature.mockResolvedValue(err({ kind: 'feature_not_included', detail: 'no' }))
    setPassword.mockResolvedValue(ok(undefined))
    const { setEventPrivacyAction } = await import('./actions')

    expect(await setEventPrivacyAction({ status: 'idle' }, privacidad('public'))).toEqual({ status: 'success' })
    expect(setPassword).toHaveBeenCalledWith({ eventId: 'e1', password: null })
  })
})

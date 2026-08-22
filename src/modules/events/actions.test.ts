import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { eventError } from './domain/errors'

const revokeShare = vi.fn()
const requireSession = vi.fn().mockResolvedValue({ userId: 'u1' })

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/modules/identity/session-cookie', () => ({ requireSession: () => requireSession() }))
vi.mock('@/app/composition/container', () => ({
  events: {
    revokeShare: (...args: unknown[]) => revokeShare(...args),
    create: vi.fn(),
    update: vi.fn(),
    createShare: vi.fn(),
  },
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

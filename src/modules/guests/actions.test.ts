import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { guestError } from './domain/errors'

/**
 * Revocar una invitación es la peor de las acciones que fallaban en silencio: el atelier
 * cree que cortó el acceso a alguien y no lo cortó. Devolver `void` y registrar el fallo
 * en la consola del servidor deja al usuario con la certeza de que funcionó.
 */

const revoke = vi.fn()
const requireSession = vi.fn().mockResolvedValue({ userId: 'u1' })

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/modules/identity/session-cookie', () => ({ requireSession: () => requireSession() }))
vi.mock('@/app/composition/container', () => ({
  guests: { revoke: (...args: unknown[]) => revoke(...args), list: vi.fn(), add: vi.fn() },
  plans: { allowanceFor: vi.fn(), requireFeature: vi.fn() },
}))

const form = (): FormData => {
  const fd = new FormData()
  fd.set('groupId', 'g1')
  fd.set('eventSlug', 'boda')
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue({ userId: 'u1' })
})

describe('revokeInvitationAction', () => {
  it('con la revocación aceptada devuelve el estado de éxito', async () => {
    revoke.mockResolvedValue(ok(undefined))
    const { revokeInvitationAction } = await import('./actions')

    expect(await revokeInvitationAction({ status: 'idle' }, form())).toEqual({ status: 'success' })
  })

  it('si el caso de uso rechaza, la acción devuelve el error en vez de callárselo', async () => {
    revoke.mockResolvedValue(err(guestError('not_found', 'No existe el grupo g1.')))
    const { revokeInvitationAction } = await import('./actions')

    expect(await revokeInvitationAction({ status: 'idle' }, form())).toEqual({
      status: 'error',
      message: 'not_found',
    })
  })

  it('el detalle se queda en el registro del servidor, no en el estado', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    revoke.mockResolvedValue(err(guestError('storage_failure', 'La base no responde en 127.0.0.1.')))
    const { revokeInvitationAction } = await import('./actions')

    const state = await revokeInvitationAction({ status: 'idle' }, form())

    expect(state).toEqual({ status: 'error', message: 'storage_failure' })
    expect(spy).toHaveBeenCalledWith('revocación rechazada', 'storage_failure', 'La base no responde en 127.0.0.1.')
    spy.mockRestore()
  })

  it('exige sesión antes de tocar nada', async () => {
    revoke.mockResolvedValue(ok(undefined))
    const { revokeInvitationAction } = await import('./actions')

    await revokeInvitationAction({ status: 'idle' }, form())
    expect(requireSession).toHaveBeenCalled()
  })
})

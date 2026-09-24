import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/result'

/**
 * El candado de la contraseña del evento tiene que cerrar **las escrituras**, no solo la
 * pantalla. La página del invitado es un render; la Server Action es un extremo HTTP
 * público, y con el enlace en la mano se puede llamar sin pasar por la puerta.
 */

const respond = vi.fn()
const resolveByToken = vi.fn()
const eventUnlocked = vi.fn()
const avisar = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/app/composition/container', () => ({
  rsvp: { respond: (...args: unknown[]) => respond(...args) },
  guests: { resolveByToken: (...args: unknown[]) => resolveByToken(...args) },
}))
vi.mock('@/app/_acciones/events/actions', () => ({ eventUnlocked: (...args: unknown[]) => eventUnlocked(...args) }))
vi.mock('@/app/_acciones/avisar-a-los-anfitriones', () => ({ avisarALosAnfitriones: (...args: unknown[]) => avisar(...args) }))

const form = (): FormData => {
  const fd = new FormData()
  fd.set('token', 'tok')
  fd.set('attending', '2')
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveByToken.mockResolvedValue(ok({ id: 'g1', eventId: 'e1', label: 'Familia Vargas' }))
  respond.mockResolvedValue(ok({ attending: 2 }))
})

describe('respondAction con un evento protegido', () => {
  it('sin desbloquear, no confirma nada', async () => {
    eventUnlocked.mockResolvedValue(false)
    const { respondAction } = await import('@/app/_acciones/rsvp/actions')

    const outcome = await respondAction({ status: 'idle' }, form())

    expect(outcome.status).toBe('error')
    expect(respond).not.toHaveBeenCalled()
    expect(avisar).not.toHaveBeenCalled()
  })

  it('desbloqueado, confirma con normalidad', async () => {
    eventUnlocked.mockResolvedValue(true)
    const { respondAction } = await import('@/app/_acciones/rsvp/actions')

    await respondAction({ status: 'idle' }, form())

    expect(respond).toHaveBeenCalled()
    // Y los anfitriones reciben su aviso: quién, de qué evento y cuántos vienen.
    expect(avisar).toHaveBeenCalledWith({ eventId: 'e1', invitado: 'Familia Vargas', asistentes: 2, mensaje: null })
  })
})

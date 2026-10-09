import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Lo celebrado queda para mirar (8 de octubre): desde las 06:00 del día siguiente, la guardia de toda acción
 * del evento no deja escribir a nadie del equipo; el admin sí, y agradecer mensajes también.
 */

const tocar = vi.fn()
const redirect = vi.fn((destino: string) => {
  throw new Error(`NEXT_REDIRECT ${destino}`)
})

vi.mock('next/navigation', () => ({ notFound: vi.fn(), redirect: (destino: string) => redirect(destino) }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ referer: 'https://luxuryatelier.net/panel/eventos/boda/mesas?panel=mesa' }),
  cookies: async () => ({ get: () => undefined }),
}))
vi.mock('@/shared/observability/fallos', () => ({ registrarFallo: vi.fn() }))
vi.mock('@/app/composition/container', () => ({ admin: {}, identity: {}, events: { tocar: (...a: unknown[]) => tocar(...a) } }))

const cliente = { userId: 'u1', email: 'c@x.bo', role: 'cliente', mustChangePassword: false } as const
const admin = { ...cliente, role: 'admin' } as const

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

const celebrado = () => tocar.mockResolvedValue({ id: 'e1', slug: 'boda', eventDate: '2026-10-03' })

describe('requireEventAccess con el evento celebrado', () => {
  it('el equipo no escribe: vuelve a la pantalla de la que vino, sin el diálogo', async () => {
    vi.setSystemTime(new Date('2026-10-04T06:00:00-04:00'))
    celebrado()
    const { requireEventAccess } = await import('./sesion')
    await expect(requireEventAccess(cliente, { eventId: 'e1', section: 'cliente' })).rejects.toThrow('NEXT_REDIRECT /panel/eventos/boda/mesas')
  })

  it('la madrugada de la fiesta sigue abierta', async () => {
    vi.setSystemTime(new Date('2026-10-04T05:30:00-04:00'))
    celebrado()
    const { requireEventAccess } = await import('./sesion')
    await expect(requireEventAccess(cliente, { eventId: 'e1', section: 'cliente' })).resolves.toBe('e1')
  })

  it('el admin sí corrige, también entrando como el cliente', async () => {
    vi.setSystemTime(new Date('2026-12-01T12:00:00-04:00'))
    celebrado()
    const { requireEventAccess } = await import('./sesion')
    await expect(requireEventAccess(admin, { eventId: 'e1', section: 'ficha' })).resolves.toBe('e1')
    await expect(requireEventAccess({ ...cliente, soporte: { adminUserId: 'a1' } } as never, { eventId: 'e1', section: 'cliente' })).resolves.toBe('e1')
  })

  it('agradecer los mensajes sigue después de la fiesta', async () => {
    vi.setSystemTime(new Date('2026-12-01T12:00:00-04:00'))
    celebrado()
    const { requireEventAccess } = await import('./sesion')
    await expect(requireEventAccess(cliente, { eventId: 'e1', section: 'cliente', aunCelebrado: true })).resolves.toBe('e1')
  })
})

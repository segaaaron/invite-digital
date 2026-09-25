import { describe, expect, it, vi } from 'vitest'

const esAdmin = vi.fn()
vi.mock('@/app/_acciones/sesion', () => ({
  requireAdmin: async () => {
    if (!esAdmin()) throw new Error('NEXT_NOT_FOUND')
    return { userId: 'u1', role: 'admin', email: 'a@x.bo' }
  },
}))
vi.mock('@/shared/db/client', () => ({ pg: { listen: () => Promise.resolve() } }))

const { GET } = await import('./route')
const { repartir } = await import('@/shared/db/cambios-en-vivo')

describe('GET /panel/admin/en-vivo', () => {
  it('quien no es admin no llega a escuchar', async () => {
    esAdmin.mockReturnValue(false)
    await expect(GET(new Request('http://x/panel/admin/en-vivo'))).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('el admin recibe consultas y pedidos, y nada de los eventos', async () => {
    esAdmin.mockReturnValue(true)
    const control = new AbortController()
    const lector = (await GET(new Request('http://x/panel/admin/en-vivo', { signal: control.signal }))).body!.getReader()
    await lector.read()
    repartir('admin', 'consulta')
    expect(new TextDecoder().decode((await lector.read()).value)).toContain('"tipo":"consulta"')
    repartir('admin', 'rsvp')
    expect(new TextDecoder().decode((await lector.read()).value)).not.toContain('rsvp')
    control.abort()
  })
})

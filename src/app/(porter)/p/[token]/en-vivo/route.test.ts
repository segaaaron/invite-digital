import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'

let cookie: string | undefined
const resolve = vi.fn()
const requireFeature = vi.fn()
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => (cookie === undefined ? undefined : { value: cookie }) }) }))
vi.mock('@/app/composition/container', () => ({
  porters: { resolve: (...args: unknown[]) => resolve(...args) },
  plans: { requireFeature: (...args: unknown[]) => requireFeature(...args) },
}))
vi.mock('@/shared/db/client', () => ({ pg: { listen: () => Promise.resolve() } }))

const { GET } = await import('./route')
const { repartir } = await import('@/shared/db/cambios-en-vivo')

const pedir = (control = new AbortController()) => GET(new Request('http://x/p/tok/en-vivo', { signal: control.signal }), { params: Promise.resolve({ token: 'tok' }) })

beforeEach(() => {
  vi.clearAllMocks()
  cookie = 'tok'
  requireFeature.mockResolvedValue(ok(null))
})

describe('GET /p/[token]/en-vivo', () => {
  it('sin su cookie de puerta, 404', async () => {
    cookie = undefined
    expect((await pedir()).status).toBe(404)
  })

  it('con el acceso quitado o fuera de su ventana, 404', async () => {
    resolve.mockResolvedValue(err({ kind: 'not_found', detail: '' }))
    expect((await pedir()).status).toBe(404)
  })

  it('sin modo puerta en el plan, 404', async () => {
    resolve.mockResolvedValue(ok({ eventId: 'e1' }))
    requireFeature.mockResolvedValue(err({ kind: 'feature_locked', detail: '' }))
    expect((await pedir()).status).toBe(404)
  })

  it('con acceso vigente, solo los ingresos de su evento', async () => {
    const id = `portero-${crypto.randomUUID()}`
    resolve.mockResolvedValue(ok({ eventId: id }))
    const control = new AbortController()
    const lector = (await pedir(control)).body!.getReader()
    await lector.read()
    repartir(id, 'visita')
    expect(new TextDecoder().decode((await lector.read()).value)).toBe('id: 1\n\n')
    repartir(id, 'ingreso')
    expect(new TextDecoder().decode((await lector.read()).value)).toContain('"tipo":"ingreso"')
    control.abort()
  })
})

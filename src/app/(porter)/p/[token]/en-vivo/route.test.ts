import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'

let cookie: string | undefined
const resolveDelEnlace = vi.fn()
const requireFeature = vi.fn()
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => (cookie === undefined ? undefined : { value: cookie }) }) }))
vi.mock('@/app/composition/container', () => ({
  porters: { resolveDelEnlace: (...args: unknown[]) => resolveDelEnlace(...args) },
  plans: { requireFeature: (...args: unknown[]) => requireFeature(...args) },
}))
vi.mock('@/shared/db/client', () => ({ pg: { listen: () => Promise.resolve() } }))

const { GET } = await import('./route')
const { repartir } = await import('@/shared/db/cambios-en-vivo')

const pedir = (control = new AbortController()) => GET(new Request('http://x/p/tok/en-vivo', { signal: control.signal }), { params: Promise.resolve({ token: 'tok' }) })

beforeEach(() => {
  vi.clearAllMocks()
  cookie = 'sesion-firmada'
  requireFeature.mockResolvedValue(ok(null))
})

describe('GET /p/[token]/en-vivo', () => {
  it('sin su cookie de puerta, 404', async () => {
    cookie = undefined
    expect((await pedir()).status).toBe(404)
  })

  it('la sesión viaja con el enlace que se abre: el servidor comprueba los dos', async () => {
    resolveDelEnlace.mockResolvedValue(ok({ eventId: 'e1' }))
    await pedir()
    expect(resolveDelEnlace).toHaveBeenCalledWith({ cookie: 'sesion-firmada', token: 'tok' })
  })

  it('con una sesión que este servidor no firmó —el token del enlace, por ejemplo—, 404', async () => {
    // F3/F4/F6: la cookie era el propio token, así que el enlace reenviado abría el canal.
    resolveDelEnlace.mockResolvedValue(err('invalido'))
    cookie = 'tok'
    expect((await pedir()).status).toBe(404)
  })

  it('con el acceso quitado o fuera de su ventana, 404', async () => {
    resolveDelEnlace.mockResolvedValue(err({ kind: 'not_found', detail: '' }))
    expect((await pedir()).status).toBe(404)
  })

  it('sin modo puerta en el plan, 404', async () => {
    resolveDelEnlace.mockResolvedValue(ok({ eventId: 'e1' }))
    requireFeature.mockResolvedValue(err({ kind: 'feature_locked', detail: '' }))
    expect((await pedir()).status).toBe(404)
  })

  it('con acceso vigente, los ingresos y las invitaciones de su evento, nada más', async () => {
    const id = `portero-${crypto.randomUUID()}`
    resolveDelEnlace.mockResolvedValue(ok({ eventId: id }))
    const control = new AbortController()
    const lector = (await pedir(control)).body!.getReader()
    await lector.read()
    repartir(id, 'visita')
    expect(new TextDecoder().decode((await lector.read()).value)).toBe('id: 1\n\n')
    repartir(id, 'ingreso')
    expect(new TextDecoder().decode((await lector.read()).value)).toContain('"tipo":"ingreso"')
    // Revocar o devolver una invitación mueve la lista de la puerta: tiene que llegar (`0096`).
    repartir(id, 'invitado')
    expect(new TextDecoder().decode((await lector.read()).value)).toContain('"tipo":"invitado"')
    control.abort()
  })
})

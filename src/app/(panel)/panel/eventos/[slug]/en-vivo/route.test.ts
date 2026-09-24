import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'

const getFor = vi.fn()
vi.mock('@/app/_acciones/sesion', () => ({ requireSession: async () => ({ userId: 'u1', role: 'atelier', email: 'a@x.bo' }) }))
vi.mock('@/app/composition/container', () => ({ events: { getFor: (...args: unknown[]) => getFor(...args) } }))
vi.mock('@/shared/db/client', () => ({ pg: { listen: () => Promise.resolve() } }))

const { GET } = await import('./route')
const { repartir } = await import('@/shared/db/cambios-en-vivo')

const pedir = (control: AbortController) => GET(new Request('http://x/panel/eventos/boda/en-vivo', { signal: control.signal }), { params: Promise.resolve({ slug: 'boda' }) })
const noEsSuyo = err({ kind: 'not_found', detail: '' })

beforeEach(() => vi.clearAllMocks())

describe('GET /panel/eventos/[slug]/en-vivo', () => {
  it('sin acceso al evento, 404: como un evento ajeno', async () => {
    getFor.mockResolvedValue(noEsSuyo)
    const respuesta = await pedir(new AbortController())
    expect(respuesta.status).toBe(404)
  })

  it('quien abre la sección del anfitrión recibe las respuestas', async () => {
    const id = `ruta-${crypto.randomUUID()}`
    getFor.mockImplementation(async (_actor: unknown, _slug: string, opciones: { section: string }) => (opciones.section === 'cliente' ? ok({ id }) : noEsSuyo))
    const control = new AbortController()
    const lector = (await pedir(control)).body!.getReader()
    await lector.read()
    repartir(id, 'rsvp')
    expect(new TextDecoder().decode((await lector.read()).value)).toContain('"tipo":"rsvp"')
    control.abort()
  })

  it('el personal de puerta solo recibe ingresos, nunca respuestas', async () => {
    const id = `ruta-${crypto.randomUUID()}`
    getFor.mockImplementation(async (_actor: unknown, _slug: string, opciones: { section: string }) => (opciones.section === 'checkin' ? ok({ id }) : noEsSuyo))
    const control = new AbortController()
    const lector = (await pedir(control)).body!.getReader()
    await lector.read()
    repartir(id, 'rsvp')
    expect(new TextDecoder().decode((await lector.read()).value)).toBe('id: 1\n\n')
    repartir(id, 'ingreso')
    expect(new TextDecoder().decode((await lector.read()).value)).toContain('"tipo":"ingreso"')
    control.abort()
  })
})

import { describe, expect, it, vi } from 'vitest'

// Sin base: la escucha de Postgres se simula; se reparte a mano con `repartir`.
vi.mock('@/shared/db/client', () => ({ pg: { listen: () => Promise.resolve() } }))

const { repartir } = await import('@/shared/db/cambios-en-vivo')
const { respuestaDeCambios } = await import('./sse-de-cambios')

const leer = (respuesta: Response) => {
  const lector = respuesta.body!.getReader()
  const decodificar = new TextDecoder()
  return async () => decodificar.decode((await lector.read()).value)
}

describe('respuestaDeCambios', () => {
  it('abre con su versión, avisa lo permitido y a lo demás solo le mueve la versión', async () => {
    const id = `sse-${crypto.randomUUID()}`
    const control = new AbortController()
    const respuesta = respuestaDeCambios(new Request('http://x/en-vivo', { signal: control.signal }), id, new Set(['ingreso']))

    expect(respuesta.headers.get('content-type')).toContain('text/event-stream')
    // `no-transform`: la compresión de Next no toca esta respuesta, así que no la retiene.
    expect(respuesta.headers.get('cache-control')).toContain('no-transform')

    const siguiente = leer(respuesta)
    expect(await siguiente()).toBe('retry: 3000\nid: 0\n\n')

    repartir(id, 'ingreso')
    expect(await siguiente()).toBe('id: 1\nevent: cambio\ndata: {"tipo":"ingreso"}\n\n')

    // La puerta no ve respuestas: le llega la versión, sin evento que dispare nada.
    repartir(id, 'rsvp')
    expect(await siguiente()).toBe('id: 2\n\n')
    control.abort()
  })

  it('al reconectar con algo perdido en medio, pide ponerse al día una vez', async () => {
    const id = `sse-${crypto.randomUUID()}`
    repartir(id, 'rsvp')
    repartir(id, 'rsvp')
    const control = new AbortController()
    const respuesta = respuestaDeCambios(new Request('http://x/en-vivo', { headers: { 'Last-Event-ID': '1' }, signal: control.signal }), id, new Set(['rsvp']))
    expect(await leer(respuesta)()).toBe('id: 2\nevent: cambio\ndata: {"tipo":"resync"}\n\n')
    control.abort()
  })

  it('al reconectar sin nada perdido, no pide nada', async () => {
    const id = `sse-${crypto.randomUUID()}`
    repartir(id, 'rsvp')
    const control = new AbortController()
    const respuesta = respuestaDeCambios(new Request('http://x/en-vivo', { headers: { 'Last-Event-ID': '1' }, signal: control.signal }), id, new Set(['rsvp']))
    expect(await leer(respuesta)()).toBe('retry: 3000\nid: 1\n\n')
    control.abort()
  })

  it('al cerrar la pestaña deja de escuchar: no se queda nada colgado', async () => {
    const id = `sse-${crypto.randomUUID()}`
    const control = new AbortController()
    const respuesta = respuestaDeCambios(new Request('http://x/en-vivo', { signal: control.signal }), id, new Set(['rsvp']))
    const lector = respuesta.body!.getReader()
    await lector.read()
    control.abort()
    // Tras cerrar, el stream termina: no llega ningún aviso más.
    repartir(id, 'rsvp')
    expect((await lector.read()).done).toBe(true)
  })
})

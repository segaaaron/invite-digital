import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MediaStorage } from '../application/ports'
import { conRespaldo, createR2MediaStorage } from './r2-media-storage'

const KEY = '3f2b8a52-8f49-4b3a-9c1e-0d6a5b7c8e9f.webp'
const R2 = createR2MediaStorage({ endpoint: 'https://cuenta.r2.cloudflarestorage.com/', bucket: 'album', keyId: 'AKID', secret: 'SECRETO' })

afterEach(() => vi.unstubAllGlobals())

describe('createR2MediaStorage', () => {
  it('guarda con una petición PUT firmada a la dirección del bucket', async () => {
    const fetchSim = vi.fn(async (_u: unknown, _i?: unknown) => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchSim)
    await R2.put(KEY, new Uint8Array([1, 2, 3]))

    const [entrada] = fetchSim.mock.calls[0]!
    const peticion = entrada as Request
    expect(peticion.method).toBe('PUT')
    expect(peticion.url).toBe(`https://cuenta.r2.cloudflarestorage.com/album/${KEY}`)
    expect(peticion.headers.get('authorization')).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\//)
  })

  it('un 404 al leer es «no está»; otro error lanza, no se pierde en silencio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
    expect(await R2.get(KEY)).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })))
    await expect(R2.get(KEY)).rejects.toThrow(/500/)
    await expect(R2.put(KEY, new Uint8Array())).rejects.toThrow(/500/)
  })

  it('borrar lo que ya no está no es un fallo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
    await expect(R2.remove(KEY)).resolves.toBeUndefined()
  })

  it('rechaza una clave que no la acuñó el servidor, antes de armar la dirección', async () => {
    await expect(R2.get('../otra-cosa')).rejects.toThrow(/no admitida/)
  })
})

describe('conRespaldo', () => {
  const memoria = (): MediaStorage & { datos: Map<string, Uint8Array> } => {
    const datos = new Map<string, Uint8Array>()
    return { datos, put: async (k, b) => void datos.set(k, b), get: async (k) => datos.get(k) ?? null, remove: async (k) => void datos.delete(k) }
  }

  it('escribe en el principal, lee de los dos y borra en los dos', async () => {
    const principal = memoria()
    const respaldo = memoria()
    respaldo.datos.set('vieja', new Uint8Array([9]))
    const a = conRespaldo(principal, respaldo)

    await a.put('nueva', new Uint8Array([1]))
    expect([...principal.datos.keys()]).toEqual(['nueva'])
    expect(respaldo.datos.has('nueva')).toBe(false)
    // Lo que ya estaba en el disco sigue sirviéndose.
    expect([...((await a.get('vieja')) ?? [])]).toEqual([9])

    await a.remove('vieja')
    await a.remove('nueva')
    expect(principal.datos.size + respaldo.datos.size).toBe(0)
  })
})

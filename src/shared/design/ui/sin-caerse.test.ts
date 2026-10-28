import { describe, expect, it } from 'vitest'
import { esSaltoDeNext, sinCaerse } from './sin-caerse'

describe('sinCaerse', () => {
  it('devuelve lo de la acción; si el servidor falla, el estado de fallo en vez de lanzar', async () => {
    const bien = sinCaerse(async (_: { s: string }, n: number) => ({ s: `ok ${n}` }), { s: 'fallo' })
    expect(await bien({ s: '' }, 1)).toEqual({ s: 'ok 1' })
    const mal = sinCaerse(async () => Promise.reject(new Error('An unexpected response was received from the server.')), { s: 'fallo' })
    expect(await mal({ s: '' }, 1)).toEqual({ s: 'fallo' })
  })

  it('las redirecciones y el 404 de Next no son fallos: se dejan pasar', async () => {
    const redirige = sinCaerse(async () => Promise.reject(Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/panel;307;' })), { s: 'fallo' })
    await expect(redirige({ s: '' }, 1)).rejects.toThrow('NEXT_REDIRECT')
  })
})

describe('esSaltoDeNext', () => {
  it('reconoce los saltos de Next, que quien los atrape tiene que volver a lanzar', () => {
    expect(esSaltoDeNext(Object.assign(new Error('x'), { digest: 'NEXT_REDIRECT;replace;/dashboard/login;307;' }))).toBe(true)
    expect(esSaltoDeNext(Object.assign(new Error('x'), { digest: 'NEXT_NOT_FOUND' }))).toBe(true)
  })

  it('y no confunde un fallo de verdad con un salto', () => {
    expect(esSaltoDeNext(new Error('se cortó la conexión'))).toBe(false)
    expect(esSaltoDeNext(Object.assign(new Error('x'), { digest: 'OTRA_COSA' }))).toBe(false)
    expect(esSaltoDeNext(undefined)).toBe(false)
  })
})

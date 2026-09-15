import { describe, expect, it, vi } from 'vitest'
import { err, ok, type Result } from '@/shared/result'
import { lecturaCacheada, type Cachear } from './lectura-cacheada'

/** Un doble de `unstable_cache`: memoriza por argumentos, y un rechazo no se guarda —como Next—. */
const memoria = (): { cachear: Cachear; claves: string[][]; etiquetas: string[][] } => {
  const guardado = new Map<string, unknown>()
  const claves: string[][] = []
  const etiquetas: string[][] = []
  const cachear: Cachear = (fn, keyParts, opciones) => {
    claves.push(keyParts)
    etiquetas.push(opciones.tags)
    return async (...args: unknown[]) => {
      const clave = JSON.stringify([keyParts, args])
      if (guardado.has(clave)) return guardado.get(clave)
      const valor = await fn(...args)
      guardado.set(clave, valor)
      return valor
    }
  }
  return { cachear, claves, etiquetas }
}

describe('lecturaCacheada', () => {
  it('la segunda visita no vuelve a la base', async () => {
    const { cachear } = memoria()
    const leer = vi.fn(async (locale: string): Promise<Result<string[], string>> => ok([`planes-${locale}`]))
    const cacheada = lecturaCacheada(leer, { clave: 'planes', etiquetas: ['web:catalogo'] }, cachear)

    expect(await cacheada('es')).toEqual(ok(['planes-es']))
    expect(await cacheada('es')).toEqual(ok(['planes-es']))
    expect(await cacheada('en')).toEqual(ok(['planes-en']))
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('un error se devuelve igual pero no se guarda: la siguiente visita vuelve a intentarlo', async () => {
    const { cachear } = memoria()
    const leer = vi
      .fn<(locale: string) => Promise<Result<string[], string>>>()
      .mockResolvedValueOnce(err('la base no responde'))
      .mockResolvedValueOnce(ok(['planes']))
    const cacheada = lecturaCacheada(leer, { clave: 'planes', etiquetas: ['web:catalogo'] }, cachear)

    expect(await cacheada('es')).toEqual(err('la base no responde'))
    expect(await cacheada('es')).toEqual(ok(['planes']))
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('una excepción de la base se propaga sin guardarse', async () => {
    const { cachear } = memoria()
    const leer = vi.fn<() => Promise<Result<string, string>>>().mockRejectedValueOnce(new Error('ECONNREFUSED')).mockResolvedValueOnce(ok('bien'))
    const cacheada = lecturaCacheada(leer, { clave: 'ajustes', etiquetas: ['web:ajustes'] }, cachear)

    await expect(cacheada()).rejects.toThrow('ECONNREFUSED')
    expect(await cacheada()).toEqual(ok('bien'))
  })

  it('declara su clave y sus etiquetas, con una hora como red de seguridad', async () => {
    const { cachear, claves, etiquetas } = memoria()
    lecturaCacheada(async () => ok(1), { clave: 'extras', etiquetas: ['web:extras'] }, cachear)
    expect(claves).toEqual([['web-publica', 'extras']])
    expect(etiquetas).toEqual([['web:extras']])
  })
})

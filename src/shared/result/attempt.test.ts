import { describe, expect, it } from 'vitest'
import { attempt, err, isErr, isOk, ok } from './index'

describe('attempt', () => {
  it('devuelve el resultado cuando la promesa se resuelve', async () => {
    const result = await attempt(async () => ok(42), () => 'fallo')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toBe(42)
  })

  it('deja pasar un error de dominio sin tocarlo', async () => {
    const result = await attempt(async () => err('sin traducción'), () => 'otro')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toBe('sin traducción')
  })

  it('convierte una excepción en error, con acceso a la causa', async () => {
    const result = await attempt(
      async () => {
        throw new Error('connect ECONNREFUSED')
      },
      (cause) => (cause instanceof Error ? cause.message : 'desconocido'),
    )

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toContain('ECONNREFUSED')
  })
})

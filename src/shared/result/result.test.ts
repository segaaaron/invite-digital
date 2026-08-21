import { describe, expect, it } from 'vitest'
import { attempt, err, isErr, isOk, mapResult, ok, unwrapOr } from './index'

describe('Result', () => {
  it('envuelve un valor exitoso', () => {
    const r = ok(42)
    expect(isOk(r)).toBe(true)
    expect(unwrapOr(r, 0)).toBe(42)
  })

  it('envuelve un error y devuelve el respaldo', () => {
    const r = err({ kind: 'not_found' as const })
    expect(isOk(r)).toBe(false)
    expect(unwrapOr(r, 7)).toBe(7)
  })

  it('estrecha el tipo cuando isOk es verdadero', () => {
    const r: ReturnType<typeof ok<string>> | ReturnType<typeof err<'boom'>> = ok('hola')
    if (isOk(r)) {
      expect(r.value.toUpperCase()).toBe('HOLA')
    }
  })
})

describe('isErr', () => {
  it('estrecha el tipo al error', () => {
    const r: ReturnType<typeof ok<number>> | ReturnType<typeof err<{ kind: 'boom' }>> = err({ kind: 'boom' })
    if (isErr(r)) {
      expect(r.error.kind).toBe('boom')
    } else {
      expect.unreachable('el resultado era un error')
    }
  })

  it('es el complemento exacto de isOk', () => {
    expect(isErr(ok(1))).toBe(false)
    expect(isErr(err('x'))).toBe(true)
  })
})

describe('mapResult', () => {
  it('transforma el valor cuando hay éxito', () => {
    expect(mapResult(ok(21), (n) => n * 2)).toEqual(ok(42))
  })

  it('deja el error intacto y no llama a la función', () => {
    let llamadas = 0
    const original = err({ kind: 'not_found' as const })

    const resultado = mapResult(original, (n: number) => {
      llamadas += 1
      return n
    })

    expect(resultado).toBe(original)
    expect(llamadas).toBe(0)
  })
})

describe('attempt', () => {
  it('devuelve el resultado tal cual cuando la promesa no lanza', async () => {
    expect(await attempt(async () => ok('bien'), () => 'nunca')).toEqual(ok('bien'))
  })

  it('respeta un err devuelto sin pasar por el manejador', async () => {
    type FalloDeEjemplo = { kind: 'not_found' | 'storage_failure'; detail: string }

    const resultado = await attempt<never, FalloDeEjemplo>(
      async () => err({ kind: 'not_found', detail: 'no está' }),
      () => ({ kind: 'storage_failure', detail: 'no debería usarse' }),
    )

    expect(resultado).toEqual(err({ kind: 'not_found', detail: 'no está' }))
  })

  // Este es el motivo de que `attempt` exista: los repositorios de Drizzle lanzan
  // cuando la base no responde, en vez de devolver `err`. Sin esta red, una caída de
  // Postgres convierte una página en un 500.
  it('convierte una excepción en err, con la causa a mano', async () => {
    const resultado = await attempt(
      async () => {
        throw new Error('ECONNREFUSED')
      },
      (cause) => ({ kind: 'storage_failure' as const, detail: String(cause) }),
    )

    expect(isErr(resultado)).toBe(true)
    if (isErr(resultado)) {
      expect(resultado.error.kind).toBe('storage_failure')
      expect(resultado.error.detail).toContain('ECONNREFUSED')
    }
  })

  it('atrapa también lo que se lanza sin ser un Error', async () => {
    const resultado = await attempt(
      async () => {
        throw 'cadena pelada'
      },
      (cause) => String(cause),
    )

    expect(resultado).toEqual(err('cadena pelada'))
  })
})

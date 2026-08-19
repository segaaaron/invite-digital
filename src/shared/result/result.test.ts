import { describe, expect, it } from 'vitest'
import { err, isOk, ok, unwrapOr } from './index'

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

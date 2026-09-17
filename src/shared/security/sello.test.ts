import { describe, expect, it } from 'vitest'
import { crearSello } from './sello'

describe('crearSello', () => {
  it('abre lo que selló, y lo sellado no deja ver el texto', () => {
    const sello = crearSello('clave')
    const sellado = sello.sellar('token-abc')
    expect(sellado).not.toContain('token-abc')
    expect(sello.abrir(sellado)).toBe('token-abc')
  })

  it('con otra clave o el dato tocado no abre', () => {
    const sellado = crearSello('clave').sellar('token-abc')
    expect(crearSello('otra').abrir(sellado)).toBeNull()
    expect(crearSello('clave').abrir(`${sellado.slice(0, -2)}xx`)).toBeNull()
  })
})

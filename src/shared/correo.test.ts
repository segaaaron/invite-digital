import { describe, expect, it } from 'vitest'
import { esCorreo, MAX_CORREO } from './correo'

describe('esCorreo', () => {
  it.each(['a@b.bo', 'ana.perez+boda@invite.com.bo', 'X@Y.ORG'])('acepta %s', (correo) => {
    expect(esCorreo(correo)).toBe(true)
  })

  it.each(['', 'atelier', 'a@b', 'a@b.c', 'a b@c.bo', 'a@@c.bo', 'a@.bo', 'a@b..bo'])('rechaza %j', (correo) => {
    expect(esCorreo(correo)).toBe(false)
  })

  it('rechaza lo que pasa del tope antes de mirar la forma', () => {
    expect(esCorreo(`${'a'.repeat(MAX_CORREO)}@b.bo`)).toBe(false)
  })

  it('no se cuelga con un correo hecho para la vuelta atrás', () => {
    const malicioso = `a@${'a.'.repeat(5000)}`
    const inicio = performance.now()
    esCorreo(malicioso)
    esCorreo(malicioso.slice(0, MAX_CORREO))
    expect(performance.now() - inicio).toBeLessThan(50)
  })
})

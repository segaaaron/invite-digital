import { describe, expect, it } from 'vitest'
import { argon2Hasher } from './argon2-hasher'

describe('argon2Hasher', () => {
  it('verifica la contraseña que acaba de cifrar', async () => {
    const digest = await argon2Hasher.hash('contrasena-larga-1')
    expect(digest.startsWith('$argon2id$')).toBe(true)
    expect(await argon2Hasher.verify('contrasena-larga-1', digest)).toBe(true)
    expect(await argon2Hasher.verify('otra-contrasena-1', digest)).toBe(false)
  })

  it('devuelve false ante un hash con formato roto, en vez de lanzar', async () => {
    expect(await argon2Hasher.verify('lo-que-sea', 'no-es-un-hash')).toBe(false)
  })

  it('no repite el hash de la misma contraseña: cada uno lleva su sal', async () => {
    const uno = await argon2Hasher.hash('contrasena-larga-1')
    const otro = await argon2Hasher.hash('contrasena-larga-1')
    expect(uno).not.toBe(otro)
  })
})

import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createTokenMinter } from './tokens'

describe('createTokenMinter', () => {
  const minter = createTokenMinter()

  it('acuña 22 caracteres base64url, sin relleno', () => {
    const { token } = minter.mint()
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/)
  })

  it('no repite tokens', () => {
    const acunados = new Set(Array.from({ length: 500 }, () => minter.mint().token))
    expect(acunados.size).toBe(500)
  })

  it('el hash es el SHA-256 del token en claro', () => {
    const { token, hash } = minter.mint()
    expect(hash.equals(createHash('sha256').update(token).digest())).toBe(true)
    expect(minter.hashOf(token).equals(hash)).toBe(true)
  })
})

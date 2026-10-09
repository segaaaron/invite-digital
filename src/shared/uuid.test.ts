import { describe, expect, it } from 'vitest'
import { esUuid } from './uuid'

describe('esUuid', () => {
  it('acepta un UUID y rechaza lo demás sin preguntar a la base', () => {
    expect(esUuid('3f2a9c1e-8b7d-4e6f-9a0b-1c2d3e4f5a6b')).toBe(true)
    for (const x of ['no-existe', '', '3f2a9c1e-8b7d-4e6f-9a0b', "1' or '1'='1", '3f2a9c1e-8b7d-4e6f-9a0b-1c2d3e4f5a6bz']) expect(esUuid(x), x).toBe(false)
  })
})

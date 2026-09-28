import { describe, expect, it } from 'vitest'
import { plural } from './plural'

describe('plural', () => {
  it('concuerda con la cifra', () => {
    expect(plural(1, 'invitación', 'invitaciones')).toBe('1 invitación')
    expect(plural(0, 'invitación', 'invitaciones')).toBe('0 invitaciones')
    expect(plural(3, 'pedido aprobado', 'pedidos aprobados')).toBe('3 pedidos aprobados')
  })
})

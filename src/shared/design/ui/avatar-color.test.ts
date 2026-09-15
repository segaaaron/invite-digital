import { describe, expect, it } from 'vitest'
import { avatarColor } from '@/shared/design/ui/avatar-color'

describe('avatarColor', () => {
  it('el mismo nombre da siempre el mismo color', () => {
    expect(avatarColor('Ana Lucía Vega')).toBe(avatarColor('Ana Lucía Vega'))
  })

  it('nombres distintos reparten la paleta de verdad, no se amontonan en dos colores', () => {
    // `> 1` no probaba nada: un hash que colapsara en dos colores lo pasaría igual.
    const colores = new Set(['Ana', 'Roberto', 'Familia García', 'Patricia', 'Daniel', 'Carmen'].map(avatarColor))
    expect(colores.size).toBeGreaterThanOrEqual(4)
  })

  it('un nombre vacío no revienta ni devuelve nada', () => {
    expect(avatarColor('')).toMatch(/^from-avatar-/)
  })
})

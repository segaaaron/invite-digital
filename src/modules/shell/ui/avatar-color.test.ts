import { describe, expect, it } from 'vitest'
import { avatarColor } from './avatar-color'

describe('avatarColor', () => {
  it('el mismo nombre da siempre el mismo color', () => {
    expect(avatarColor('Ana Lucía Vega')).toBe(avatarColor('Ana Lucía Vega'))
  })

  it('nombres distintos reparten la paleta', () => {
    const colores = new Set(['Ana', 'Roberto', 'Familia García', 'Patricia', 'Daniel', 'Carmen'].map(avatarColor))
    expect(colores.size).toBeGreaterThan(1)
  })

  it('un nombre vacío no revienta ni devuelve nada', () => {
    expect(avatarColor('')).toMatch(/^from-avatar-/)
  })
})

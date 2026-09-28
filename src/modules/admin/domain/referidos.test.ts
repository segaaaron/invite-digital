import { describe, expect, it } from 'vitest'
import { LARGO_DE_CODIGO, normalizarCodigo, nuevoCodigoDeReferido } from './referidos'

describe('códigos de referido', () => {
  it('se acuñan sin letras que se confunden al dictarlas', () => {
    for (let i = 0; i < 50; i += 1) expect(nuevoCodigoDeReferido()).toMatch(new RegExp(`^[2-9A-HJKMNP-Z]{${LARGO_DE_CODIGO}}$`))
  })

  it('aceptan minúsculas, espacios y guiones, y rechazan lo que no es un código', () => {
    expect(normalizarCodigo('ab-c 234')).toBe('ABC234')
    expect(normalizarCodigo('abc10o')).toBeNull()
    expect(normalizarCodigo('')).toBeNull()
  })
})

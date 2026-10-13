import { describe, expect, it } from 'vitest'
import { coincide } from './coincide'

describe('coincide: encontrar a un invitado como lo nombra la persona', () => {
  it('«la familia Torres» encuentra la invitación de Pedro Torres', () => {
    expect(coincide('Pedro Torres Pedro Torres', 'la familia Torres')).toBe(true)
    expect(coincide('Marta Torres Familia Torres', 'familia torres')).toBe(true)
  })
  it('todas las palabras con significado, en cualquier orden y sin tildes', () => {
    expect(coincide('Ana Lucía Vega', 'vega ana')).toBe(true)
    expect(coincide('Ana Lucía Vega', 'Ana Rojas')).toBe(false)
  })
  it('por sonido, un dictado con otra ortografía', () => {
    expect(coincide('Ramón Pérez', 'ramon peres')).toBe(false)
    expect(coincide('Ramón Pérez', 'ramon peres', { porSonido: true })).toBe(true)
  })
  it('un código de pase o una frase sin palabras con significado se busca tal cual', () => {
    expect(coincide('K7M2Q', 'k7m2q')).toBe(true)
  })
})

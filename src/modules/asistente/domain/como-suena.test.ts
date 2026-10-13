import { describe, expect, it } from 'vitest'
import { comoSuena } from './como-suena'

describe('comoSuena: un nombre dictado se encuentra aunque se escriba distinto', () => {
  it('iguala lo que en español suena igual', () => {
    expect(comoSuena('Ramón Pérez')).toBe(comoSuena('ramon peres'))
    expect(comoSuena('Valeria Llanos')).toBe(comoSuena('Baleria Yanos'))
    expect(comoSuena('Hugo Cecilia')).toBe(comoSuena('Ugo Sesilia'))
    expect(comoSuena('Quispe')).toBe(comoSuena('Kispe'))
  })
  it('no junta nombres que suenan distinto', () => {
    expect(comoSuena('Ramón Pérez')).not.toBe(comoSuena('Ramón Pardo'))
    expect(comoSuena('Ana')).not.toBe(comoSuena('Ada'))
  })
})

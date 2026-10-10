import { describe, expect, it } from 'vitest'
import { celularDictado } from './whatsapp'

describe('celularDictado (9 oct: «el teléfono lo toma con números largos»)', () => {
  it('ocho cifras de Bolivia, con o sin 591, quedan en internacional', () => {
    expect(celularDictado('70012345')).toBe('+59170012345')
    expect(celularDictado('700 123 45')).toBe('+59170012345')
    expect(celularDictado('+591 700 12345')).toBe('+59170012345')
    expect(celularDictado('59170012345')).toBe('+59170012345')
  })
  it('un número de más o de menos no se guarda: hay que preguntarlo', () => {
    expect(celularDictado('77 712 345 678')).toBeNull()
    expect(celularDictado('7001234')).toBeNull()
    expect(celularDictado('80012345')).toBeNull()
  })
  it('un extranjero dicho con su + y código de país vale', () => {
    expect(celularDictado('+54 9 11 2345 6789')).toBe('+5491123456789')
  })
})

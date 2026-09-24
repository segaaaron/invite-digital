import { describe, expect, it } from 'vitest'
import { patronDeBusqueda } from './busqueda'

describe('patronDeBusqueda', () => {
  it('busca lo escrito en cualquier parte, sin espacios de sobra', () => {
    expect(patronDeBusqueda('  María   Rojas ')).toBe('%María Rojas%')
  })

  it('con menos de dos letras no busca', () => {
    expect(patronDeBusqueda('')).toBeNull()
    expect(patronDeBusqueda(' a ')).toBeNull()
  })

  it('los comodines de SQL se buscan como texto', () => {
    expect(patronDeBusqueda('50%_x\\')).toBe('%50\\%\\_x\\\\%')
  })

  it('no deja pasar un texto enorme', () => {
    expect(patronDeBusqueda('x'.repeat(500))?.length).toBe(82)
  })
})

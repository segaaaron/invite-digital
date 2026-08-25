import { describe, expect, it } from 'vitest'
import { matchesSearch } from './SeatingSearchContext'

describe('matchesSearch', () => {
  it('un término vacío no resalta nada: iluminarlo todo es no iluminar nada', () => {
    expect(matchesSearch('', ['Familia Rojas'])).toBe(false)
    expect(matchesSearch('   ', ['Familia Rojas'])).toBe(false)
  })

  it('encuentra por trozo del nombre y sin distinguir mayúsculas', () => {
    expect(matchesSearch('rojas', ['Familia Rojas'])).toBe(true)
    expect(matchesSearch('ROJAS', ['Familia Rojas'])).toBe(true)
  })

  it('una mesa con varios grupos se resalta si coincide cualquiera', () => {
    expect(matchesSearch('camila', ['Familia Rojas', 'Camila Vargas'])).toBe(true)
  })

  it('lo que no coincide no se resalta', () => {
    expect(matchesSearch('zulema', ['Familia Rojas'])).toBe(false)
  })
})

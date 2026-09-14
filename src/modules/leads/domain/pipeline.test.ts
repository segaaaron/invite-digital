import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { destinosDesde, mover, parseEstado, tasaDeCierre } from './pipeline'

describe('embudo de consultas', () => {
  it('una nueva se contacta, se gana o se pierde', () => {
    expect(destinosDesde('new')).toEqual(['contacted', 'won', 'lost'])
    expect(isOk(mover('new', 'contacted', ''))).toBe(true)
  })

  it('una contactada no vuelve a nueva', () => {
    const r = mover('contacted', 'new', '')
    expect(isErr(r) && r.error.kind).toBe('invalid_transition')
  })

  it('ganada es definitiva: detrás hay una boda', () => {
    expect(destinosDesde('won')).toEqual([])
    const r = mover('won', 'lost', 'se arrepintió')
    expect(isErr(r) && r.error.kind).toBe('invalid_transition')
  })

  it('una perdida se reabre como contactada: volvió a escribir', () => {
    expect(isOk(mover('lost', 'contacted', ''))).toBe(true)
  })

  it('perderla exige el motivo, y un motivo de espacios no cuenta', () => {
    const r = mover('contacted', 'lost', '   ')
    expect(isErr(r) && r.error.kind).toBe('missing_note')
    const bien = mover('contacted', 'lost', '  eligió otra empresa ')
    expect(isOk(bien) && bien.value.note).toBe('eligió otra empresa')
  })

  it('una nota vacía se guarda como nula, no como cadena vacía', () => {
    const r = mover('new', 'contacted', '  ')
    expect(isOk(r) && r.value.note).toBe(null)
  })

  it('un estado desconocido de la base se lee como nueva: sin atender es lo seguro', () => {
    expect(parseEstado('won')).toBe('won')
    expect(parseEstado('cualquiera')).toBe('new')
  })

  it('la tasa de cierre cuenta solo lo decidido', () => {
    expect(tasaDeCierre({ new: 10, contacted: 5, won: 3, lost: 1 })).toBe(0.75)
    expect(tasaDeCierre({ new: 4, contacted: 0, won: 0, lost: 0 })).toBe(null)
  })
})

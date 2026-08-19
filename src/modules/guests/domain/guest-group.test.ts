import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createGuestGroup, isRevoked } from './guest-group'

const base = { id: 'g1', eventId: 'e1', label: 'Familia Rojas Peña', seats: 4, revokedAt: null }

describe('createGuestGroup', () => {
  it('construye un grupo válido', () => {
    expect(isOk(createGuestGroup(base))).toBe(true)
  })

  it('una persona sola es un grupo de un cupo', () => {
    expect(isOk(createGuestGroup({ ...base, label: 'Daniela Ortiz', seats: 1 }))).toBe(true)
  })

  it('rechaza cero cupos: un grupo sin cupos no es una invitación', () => {
    const result = createGuestGroup({ ...base, seats: 0 })
    expect(isErr(result) && result.error.kind).toBe('invalid_seats')
  })

  it('rechaza cupos fraccionarios o negativos', () => {
    expect(isErr(createGuestGroup({ ...base, seats: 2.5 }))).toBe(true)
    expect(isErr(createGuestGroup({ ...base, seats: -1 }))).toBe(true)
  })

  it('rechaza una etiqueta vacía o de más de 160 caracteres', () => {
    expect(isErr(createGuestGroup({ ...base, label: '   ' }))).toBe(true)
    expect(isErr(createGuestGroup({ ...base, label: 'x'.repeat(161) }))).toBe(true)
  })

  it('recorta los espacios de la etiqueta', () => {
    const result = createGuestGroup({ ...base, label: '  Familia Rojas  ' })
    expect(isOk(result) && result.value.label).toBe('Familia Rojas')
  })
})

describe('isRevoked', () => {
  it('distingue un grupo vivo de uno revocado', () => {
    const vivo = createGuestGroup(base)
    const muerto = createGuestGroup({ ...base, revokedAt: new Date('2026-08-01T00:00:00Z') })
    expect(isOk(vivo) && isRevoked(vivo.value)).toBe(false)
    expect(isOk(muerto) && isRevoked(muerto.value)).toBe(true)
  })
})

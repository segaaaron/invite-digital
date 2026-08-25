import { describe, expect, it } from 'vitest'
import { createPerson, dietaryReport, fitsInGroup, type GuestPerson } from './person'
import { isErr, isOk } from '@/shared/result'

const persona = (over: Partial<GuestPerson> = {}): GuestPerson => ({
  id: over.id ?? crypto.randomUUID(),
  guestGroupId: 'g1',
  fullName: over.fullName ?? 'Ana Vega',
  email: over.email ?? null,
  isCompanion: over.isCompanion ?? false,
  dietaryNote: over.dietaryNote ?? null,
  vip: over.vip ?? false,
  attending: over.attending ?? null,
})

describe('createPerson', () => {
  it('exige nombre y recorta los espacios', () => {
    expect(isErr(createPerson({ id: '1', guestGroupId: 'g', fullName: '   ' }))).toBe(true)
    const ok = createPerson({ id: '1', guestGroupId: 'g', fullName: '  Ana Vega  ' })
    expect(isOk(ok) && ok.value.fullName).toBe('Ana Vega')
  })

  it('una restricción en blanco es no tener restricción', () => {
    // Guardar la cadena vacía haría que el reporte del catering la agrupara como una
    // categoría propia, y la cocina cocinaría para un plato que no existe.
    const p = createPerson({ id: '1', guestGroupId: 'g', fullName: 'Ana', dietaryNote: '   ' })
    expect(isOk(p) && p.value.dietaryNote).toBeNull()
  })

  it('rechaza una asistencia que no existe', () => {
    expect(isErr(createPerson({ id: '1', guestGroupId: 'g', fullName: 'Ana', attending: 'quizás' }))).toBe(true)
    expect(isOk(createPerson({ id: '1', guestGroupId: 'g', fullName: 'Ana', attending: 'maybe' }))).toBe(true)
  })
})

describe('fitsInGroup', () => {
  it('el cupo del grupo es el tope', () => {
    expect(fitsInGroup(4, 3)).toBe(true)
    expect(fitsInGroup(4, 4)).toBe(false)
  })
})

describe('dietaryReport', () => {
  it('agrupa sin distinguir mayúsculas ni espacios de sobra', () => {
    const filas = dietaryReport([
      persona({ dietaryNote: 'Sin gluten' }),
      persona({ dietaryNote: 'sin  gluten' }),
      persona({ dietaryNote: 'Vegetariana' }),
    ])
    expect(filas).toEqual([
      { note: 'Sin gluten', count: 2 },
      { note: 'Vegetariana', count: 1 },
    ])
  })

  it('no cuenta a quien ya dijo que no viene', () => {
    // Cocinar para quien avisó de que no asiste es comida a la basura, y en un banquete
    // se paga por plato.
    const filas = dietaryReport([
      persona({ dietaryNote: 'Sin gluten', attending: 'no' }),
      persona({ dietaryNote: 'Sin gluten', attending: 'yes' }),
    ])
    expect(filas).toEqual([{ note: 'Sin gluten', count: 1 }])
  })

  it('sin restricciones devuelve una lista vacía, no una fila en blanco', () => {
    expect(dietaryReport([persona(), persona()])).toEqual([])
  })
})

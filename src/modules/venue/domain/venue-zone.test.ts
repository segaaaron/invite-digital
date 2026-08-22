import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createVenueZone } from './venue-zone'

const base = { id: 'z1', eventId: 'e1', kind: 'dance' as const, label: 'Pista', x: 30, y: 40, w: 25, h: 20 }

describe('createVenueZone', () => {
  it('construye una zona válida', () => expect(isOk(createVenueZone(base))).toBe(true))

  it('acepta las cinco clases de zona', () => {
    for (const kind of ['dance', 'bar', 'stage', 'music', 'entrance'] as const) {
      expect(isOk(createVenueZone({ ...base, kind }))).toBe(true)
    }
  })

  it('rechaza una clase desconocida: el plano solo sabe dibujar las que conoce', () => {
    const r = createVenueZone({ ...base, kind: 'piscina' as unknown as 'dance' })
    expect(isErr(r) && r.error.kind).toBe('invalid_kind')
  })

  it('rechaza etiqueta vacía', () => {
    const r = createVenueZone({ ...base, label: '   ' })
    expect(isErr(r) && r.error.kind).toBe('invalid_label')
  })

  it('rechaza ancho cero', () => {
    const r = createVenueZone({ ...base, w: 0 })
    expect(isErr(r) && r.error.kind).toBe('invalid_size')
  })

  it('rechaza alto negativo', () => expect(isErr(createVenueZone({ ...base, h: -5 }))).toBe(true))

  it('recorta la posición al rango del plano', () => {
    const r = createVenueZone({ ...base, x: 140, y: -12 })
    expect(isOk(r) && r.value.x).toBe(100)
    expect(isOk(r) && r.value.y).toBe(0)
  })

  it('deja que la zona sobresalga del plano: x + w puede pasar de 100', () => {
    // El atelier lo corrige arrastrando; rechazarlo convertiría un ajuste visual en un error.
    const r = createVenueZone({ ...base, x: 90, w: 40 })
    expect(isOk(r) && r.value.x).toBe(90)
    expect(isOk(r) && r.value.w).toBe(40)
  })

  it('recorta los espacios de la etiqueta', () => {
    const r = createVenueZone({ ...base, label: '  Barra  ' })
    expect(isOk(r) && r.value.label).toBe('Barra')
  })
})

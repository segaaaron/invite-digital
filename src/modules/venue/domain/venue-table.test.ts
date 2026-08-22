import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createVenueTable } from './venue-table'

const base = { id: 't1', eventId: 'e1', label: 'Mesa 03', capacity: 8, shape: 'round' as const, x: 50, y: 50 }

describe('createVenueTable', () => {
  it('construye una mesa válida', () => expect(isOk(createVenueTable(base))).toBe(true))

  it('rechaza cupo cero: una mesa sin sitios no es una mesa', () => {
    const r = createVenueTable({ ...base, capacity: 0 })
    expect(isErr(r) && r.error.kind).toBe('invalid_capacity')
  })

  it('rechaza cupos negativos', () => expect(isErr(createVenueTable({ ...base, capacity: -3 }))).toBe(true))

  it('rechaza cupos fraccionarios', () => expect(isErr(createVenueTable({ ...base, capacity: 2.5 }))).toBe(true))

  it('acepta el borde: una mesa de un solo sitio', () =>
    expect(isOk(createVenueTable({ ...base, capacity: 1 }))).toBe(true))

  it('rechaza etiqueta vacía', () => {
    const r = createVenueTable({ ...base, label: '  ' })
    expect(isErr(r) && r.error.kind).toBe('invalid_label')
  })

  it('recorta los espacios de la etiqueta: «Mesa 03 » y «Mesa 03» son la misma mesa', () => {
    const r = createVenueTable({ ...base, label: '  Mesa 03  ' })
    expect(isOk(r) && r.value.label).toBe('Mesa 03')
  })

  it('recorta la posición al plano en vez de rechazarla', () => {
    const r = createVenueTable({ ...base, x: 130, y: -20 })
    expect(isOk(r) && r.value.x).toBe(100)
    expect(isOk(r) && r.value.y).toBe(0)
  })

  it('acepta las cuatro formas', () => {
    for (const shape of ['round', 'rect', 'sweetheart', 'imperial'] as const) {
      expect(isOk(createVenueTable({ ...base, shape }))).toBe(true)
    }
  })
})

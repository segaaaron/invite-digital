import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { leerPlan, MAX_FUNCIONES, type PlanCrudo } from './plan-editable'

const texto = { name: 'Atelier', tagline: 'Lo esencial', description: 'Para bodas íntimas', features: 'RSVP\n\n  Mesas  \n' }
const crudo: PlanCrudo = {
  priceCents: 69000,
  maxGuestGroups: '',
  includesSeating: true,
  includesRegistry: false,
  includesCheckin: false,
  highlighted: false,
  isActive: true,
  es: texto,
  en: { ...texto, name: 'Atelier EN' },
}

describe('leerPlan', () => {
  it('limpia las funciones: una por línea, sin vacías ni espacios de sobra', () => {
    const r = leerPlan(crudo)
    expect(isOk(r) && r.value.es.features).toEqual(['RSVP', 'Mesas'])
  })

  it('tope de grupos vacío es sin límite, no cero', () => {
    const r = leerPlan(crudo)
    expect(isOk(r) && r.value.maxGuestGroups).toBe(null)
    const conTope = leerPlan({ ...crudo, maxGuestGroups: ' 80 ' })
    expect(isOk(conTope) && conTope.value.maxGuestGroups).toBe(80)
  })

  it('un tope que no es un entero positivo se rechaza', () => {
    for (const malo of ['0', '-3', '2.5', 'muchos']) {
      const r = leerPlan({ ...crudo, maxGuestGroups: malo })
      expect(isErr(r) && r.error.kind).toBe('invalid_input')
    }
  })

  it('el precio tiene que ser mayor que cero', () => {
    const r = leerPlan({ ...crudo, priceCents: 0 })
    expect(isErr(r) && r.error.detail).toContain('precio')
  })

  it('sin funciones en un idioma se rechaza: la página de precios se caería entera', () => {
    const r = leerPlan({ ...crudo, en: { ...texto, features: ' \n ' } })
    expect(isErr(r) && r.error.detail).toContain('inglés')
  })

  it('nombre obligatorio en los dos idiomas', () => {
    const r = leerPlan({ ...crudo, es: { ...texto, name: '  ' } })
    expect(isErr(r) && r.error.detail).toContain('español')
  })

  it('no admite más funciones de las que caben en la tarjeta', () => {
    const muchas = Array.from({ length: MAX_FUNCIONES + 1 }, (_, i) => `f${i}`).join('\n')
    const r = leerPlan({ ...crudo, es: { ...texto, features: muchas } })
    expect(isErr(r)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { leerPlan, MAX_FUNCIONES, type PlanCrudo } from './plan-editable'

const texto = { name: 'Atelier', tagline: 'Lo esencial', description: 'Para bodas íntimas', features: 'RSVP\n\n  Mesas  \n' }
const crudo: PlanCrudo = {
  priceCents: 69000,
  maxGuestGroups: '',
  maxDoorPorters: '3',
  maxCohosts: '',
  maxHiredPlanners: '',
  maxGalleryPhotos: '20',
  guestPhotos: true,
  eventPassword: true,
  csvImport: false,
  onlineDays: '180',
  designChange: 'antes_de_repartir',
  plannerSuite: 'esencial',
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

  it('los porteros son un entero de 0 a 100: cero es un plan sin puerta', () => {
    expect(isOk(leerPlan(crudo)) && leerPlan(crudo)).toMatchObject({ value: { maxDoorPorters: 3 } })
    const sinPuerta = leerPlan({ ...crudo, maxDoorPorters: '0' })
    expect(isOk(sinPuerta) && sinPuerta.value.maxDoorPorters).toBe(0)
    for (const malo of ['', '-1', '2.5', '101', 'muchos']) {
      const r = leerPlan({ ...crudo, maxDoorPorters: malo })
      expect(isErr(r) && r.error.detail).toContain('porteros')
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

describe('límites nuevos del plan', () => {
  it('fotos de galería: vacío es sin límite, un número va de 1 a 200', () => {
    expect(isOk(leerPlan({ ...crudo, maxGalleryPhotos: '' })) && leerPlan({ ...crudo, maxGalleryPhotos: '' })).toMatchObject({ value: { maxGalleryPhotos: null } })
    const r = leerPlan(crudo)
    expect(isOk(r) && r.value.maxGalleryPhotos).toBe(20)
    for (const malo of ['0', '201', 'x']) {
      const f = leerPlan({ ...crudo, maxGalleryPhotos: malo })
      expect(isErr(f) && f.error.detail).toContain('fotos')
    }
  })

  it('días en línea: entero de 1 a 3650', () => {
    const r = leerPlan(crudo)
    expect(isOk(r) && r.value.onlineDays).toBe(180)
    for (const malo of ['', '0', '3651', '1.5']) {
      const f = leerPlan({ ...crudo, onlineDays: malo })
      expect(isErr(f) && f.error.detail).toContain('días')
    }
  })

  it('el cambio de modelo solo admite las tres reglas conocidas', () => {
    const f = leerPlan({ ...crudo, designChange: 'cuando-quiera' })
    expect(isErr(f) && f.error.detail).toContain('modelo')
    const r = leerPlan({ ...crudo, designChange: 'siempre', plannerSuite: 'esencial' })
    expect(isOk(r) && r.value.designChange).toBe('siempre')
  })

  it('las funciones sí/no pasan tal cual', () => {
    const r = leerPlan(crudo)
    expect(isOk(r) && r.value).toMatchObject({ guestPhotos: true, eventPassword: true, csvImport: false })
  })
})

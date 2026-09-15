import { describe, expect, it } from 'vitest'
import { type Allowance, canAddGroup, hasFeature, planThatIncludes, puedeCambiarDiseno, remainingGroups, usageRatio } from './allowance'

const atelier: Allowance = {
  planSlug: 'atelier',
  maxGuestGroups: 30,
  seating: true,
  registry: false,
  checkin: false,
  maxDoorPorters: 0,
  maxGalleryPhotos: 8,
  guestPhotos: false,
  eventPassword: false,
  csvImport: false,
  onlineDays: 60,
  designChange: 'ninguno',
}

const altaCostura: Allowance = {
  planSlug: 'alta-costura',
  maxGuestGroups: null,
  seating: true,
  registry: true,
  checkin: true,
  maxDoorPorters: 10,
  maxGalleryPhotos: null,
  guestPhotos: true,
  eventPassword: true,
  csvImport: true,
  onlineDays: 365,
  designChange: 'siempre',
}

describe('canAddGroup', () => {
  it('sin límite siempre se puede', () => expect(canAddGroup(null, 9999)).toBe(true))
  it('por debajo del límite se puede', () => expect(canAddGroup(30, 29)).toBe(true))
  // El caso que se escribe mal: con 30 de límite y 30 grupos ya creados, el siguiente
  // haría 31 y no cabe. Un `<=` aquí regalaría un grupo de más en cada plan.
  it('justo en el límite ya NO se puede', () => expect(canAddGroup(30, 30)).toBe(false))
  it('por encima tampoco', () => expect(canAddGroup(30, 31)).toBe(false))
  it('con límite cero no se puede ninguno', () => expect(canAddGroup(0, 0)).toBe(false))
})

describe('remainingGroups', () => {
  // `null`, no `Infinity`: quien lo pinta tiene que decidir qué enseñar cuando no hay
  // límite, y un número enorme se colaría en la pantalla como si fuera un margen real.
  it('sin límite devuelve null, no infinito', () => expect(remainingGroups(null, 5)).toBeNull())
  it('cuenta lo que queda', () => expect(remainingGroups(30, 28)).toBe(2))
  it('en el límite justo quedan cero', () => expect(remainingGroups(30, 30)).toBe(0))
  // Un plan puede bajar de límite después de que el evento ya tenga más grupos: la resta
  // daría negativo y «quedan -5» no significa nada.
  it('nunca devuelve negativo', () => expect(remainingGroups(30, 35)).toBe(0))
})

describe('hasFeature', () => {
  it('respeta cada bandera', () => {
    expect(hasFeature(atelier, 'seating')).toBe(true)
    expect(hasFeature(atelier, 'registry')).toBe(false)
    expect(hasFeature(atelier, 'checkin')).toBe(false)
  })

  it('el plan más caro las trae todas', () => {
    expect(hasFeature(altaCostura, 'seating')).toBe(true)
    expect(hasFeature(altaCostura, 'registry')).toBe(true)
    expect(hasFeature(altaCostura, 'checkin')).toBe(true)
  })
})

describe('usageRatio', () => {
  it('sin límite no hay proporción que calcular', () => expect(usageRatio(null, 9999)).toBeNull())
  it('la mitad del límite es 0.5', () => expect(usageRatio(30, 15)).toBe(0.5))
  it('justo al 80 % es 0.8', () => expect(usageRatio(30, 24)).toBe(0.8))
  // Sin este caso, un límite de cero haría una división por cero y saldría `Infinity` o
  // `NaN`, que compararía como falso contra cualquier umbral y no avisaría nunca.
  it('con límite cero está lleno, no partido por cero', () => expect(usageRatio(0, 0)).toBe(1))
})

describe('planThatIncludes', () => {
  const catalogo = [atelier, altaCostura]

  it('nombra el plan más barato que sí la trae', () => {
    expect(planThatIncludes('registry', catalogo)).toBe('alta-costura')
  })

  it('el plan en el que ya se está también cuenta si la trae', () => {
    expect(planThatIncludes('seating', catalogo)).toBe('atelier')
  })

  it('si no la trae ninguno devuelve null, no un plan inventado', () => {
    expect(planThatIncludes('registry', [atelier])).toBeNull()
  })
})

describe('funciones nuevas del plan', () => {
  it('fotos de invitados, contraseña e importar CSV se piden como cualquier función', () => {
    expect(hasFeature(atelier, 'guestPhotos')).toBe(false)
    expect(hasFeature(altaCostura, 'eventPassword')).toBe(true)
    expect(planThatIncludes('csvImport', [atelier, altaCostura])).toBe('alta-costura')
  })
})

describe('puedeCambiarDiseno', () => {
  it('«ninguno» nunca deja cambiar el modelo', () => {
    expect(puedeCambiarDiseno('ninguno', { enlacesRepartidos: false })).toBe(false)
  })
  it('«antes de repartir» deja cambiarlo mientras no haya salido ningún enlace', () => {
    expect(puedeCambiarDiseno('antes_de_repartir', { enlacesRepartidos: false })).toBe(true)
    expect(puedeCambiarDiseno('antes_de_repartir', { enlacesRepartidos: true })).toBe(false)
  })
  it('«siempre» lo deja cambiar aunque ya se hayan repartido', () => {
    expect(puedeCambiarDiseno('siempre', { enlacesRepartidos: true })).toBe(true)
  })
})

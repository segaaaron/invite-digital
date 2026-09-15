import { describe, expect, it } from 'vitest'
import type { PlanLimpio } from '../domain/plan-editable'
import { drizzleCatalogAdmin as catalog } from './drizzle-catalog-admin'

const texto = { name: 'x', tagline: '', description: '', features: ['x'] }
const plan: PlanLimpio = {
  priceCents: 100,
  maxGuestGroups: null,
  maxDoorPorters: 0,
  maxGalleryPhotos: null,
  guestPhotos: true,
  eventPassword: true,
  csvImport: true,
  onlineDays: 90,
  designChange: 'siempre',
  includesSeating: true,
  includesRegistry: true,
  includesCheckin: true,
  highlighted: false,
  isActive: false,
  es: texto,
  en: texto,
}

/**
 * La carrera de «dos admins retiran dos planes a la vez» NO se prueba aquí, y es a
 * propósito: exige retirar los planes reales de la base, y las suites corren en paralelo —
 * el catálogo y los límites por plan leerían la web sin precios a mitad de otra prueba—.
 * Se comprobó a mano el 14 de septiembre con `Promise.all` sobre los tres planes: una sola
 * escritura volvió `ultimo_activo` y quedó exactamente un plan activo.
 */
describe('planes contra Postgres', () => {
  it('un plan que no existe se dice, y no escribe nada', async () => {
    expect(await catalog.savePlan('no-existe', plan)).toBe('no_existe')
  })
})

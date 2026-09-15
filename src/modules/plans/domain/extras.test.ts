import { describe, expect, it } from 'vitest'
import type { Allowance } from './allowance'
import { aplicarExtras, leerExtra } from './extras'

const atelier: Allowance = {
  planSlug: 'atelier',
  maxGuestGroups: 40,
  seating: true,
  registry: false,
  checkin: false,
  maxDoorPorters: 0,
  maxCohosts: 1,
  maxHiredPlanners: 0,
  maxGalleryPhotos: 8,
  guestPhotos: false,
  eventPassword: false,
  csvImport: false,
  onlineDays: 60,
  designChange: 'ninguno',
  plannerSuite: 'esencial',
}

describe('aplicarExtras', () => {
  it('cada extra sube justo lo suyo, y se acumulan', () => {
    const con = aplicarExtras(atelier, [
      { effect: 'mas_grupos', amount: 40 },
      { effect: 'mas_grupos', amount: 40 },
      { effect: 'mas_porteros', amount: 3 },
      { effect: 'fotos_invitados', amount: 0 },
      { effect: 'cambio_modelo', amount: 0 },
      { effect: 'sumar_planner', amount: 1 },
      { effect: 'mas_dias', amount: 180 },
    ])
    expect(con).toMatchObject({
      maxGuestGroups: 120,
      maxDoorPorters: 3,
      checkin: true,
      guestPhotos: true,
      designChange: 'antes_de_repartir',
      maxHiredPlanners: 1,
      onlineDays: 240,
      plannerSuite: 'esencial',
    })
  })

  it('sin límite sigue sin límite, y un extra no baja lo que el plan ya trae', () => {
    const alta = { ...atelier, maxGuestGroups: null, designChange: 'siempre' as const, plannerSuite: 'total' as const }
    expect(aplicarExtras(alta, [{ effect: 'mas_grupos', amount: 40 }, { effect: 'cambio_modelo', amount: 0 }, { effect: 'dia_d', amount: 0 }])).toMatchObject({
      maxGuestGroups: null,
      designChange: 'siempre',
      plannerSuite: 'total',
    })
  })

  it('el Día D lleva el planner a total; un servicio no toca la capacidad', () => {
    expect(aplicarExtras({ ...atelier, plannerSuite: 'completo' }, [{ effect: 'dia_d', amount: 0 }]).plannerSuite).toBe('total')
    expect(aplicarExtras(atelier, [{ effect: 'servicio', amount: 0 }])).toEqual(atelier)
  })
})

describe('leerExtra', () => {
  it('nombre, precio en centavos y efecto conocido', () => {
    expect(leerExtra({ name: '', priceCents: 100, effect: 'mas_grupos', amount: '40', isActive: true })).toMatchObject({ ok: false })
    expect(leerExtra({ name: '+40 grupos', priceCents: -1, effect: 'mas_grupos', amount: '40', isActive: true })).toMatchObject({ ok: false })
    expect(leerExtra({ name: '+40 grupos', priceCents: 150_00, effect: 'volar', amount: '40', isActive: true })).toMatchObject({ ok: false })
    expect(leerExtra({ name: ' +40 grupos ', priceCents: 150_00, effect: 'mas_grupos', amount: '40', isActive: true })).toEqual({
      ok: true,
      valor: { name: '+40 grupos', priceCents: 150_00, effect: 'mas_grupos', amount: 40, isActive: true },
    })
  })
})

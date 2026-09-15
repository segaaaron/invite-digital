import { describe, expect, it } from 'vitest'
import type { Allowance } from './allowance'
import { aplicarExtras, extraDisponible, leerExtra } from './extras'

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

describe('aplicarExtras y el Día D', () => {
  it('solo sube el planner completo a total: sobre un plan esencial —p. ej. tras bajar de plan— no regala el completo', () => {
    expect(aplicarExtras(atelier, [{ effect: 'dia_d', amount: 0 }]).plannerSuite).toBe('esencial')
    expect(aplicarExtras({ ...atelier, plannerSuite: 'completo' }, [{ effect: 'dia_d', amount: 0 }]).plannerSuite).toBe('total')
  })
})

describe('extraDisponible', () => {
  const firma: Allowance = { ...atelier, planSlug: 'firma-3d', maxGuestGroups: 120, guestPhotos: true, designChange: 'antes_de_repartir', maxHiredPlanners: 1, plannerSuite: 'completo' }
  const alta: Allowance = { ...firma, planSlug: 'alta-costura', maxGuestGroups: null, maxHiredPlanners: null, designChange: 'siempre', plannerSuite: 'total' }

  it('el Día D solo se vende a quien ya tiene el planner completo: Atelier se llevaría proveedores y cronograma por 150 Bs', () => {
    expect(extraDisponible(atelier, 'dia_d')).toEqual({ ok: false, motivo: 'requiere_plan' })
    expect(extraDisponible(firma, 'dia_d')).toEqual({ ok: true })
    expect(extraDisponible(alta, 'dia_d')).toEqual({ ok: false, motivo: 'incluido' })
  })

  it('lo que solo se enciende no se vende a quien ya lo tiene, por plan o por un extra aprobado', () => {
    expect(extraDisponible(atelier, 'fotos_invitados')).toEqual({ ok: true })
    expect(extraDisponible(firma, 'fotos_invitados')).toEqual({ ok: false, motivo: 'incluido' })
    expect(extraDisponible(aplicarExtras(atelier, [{ effect: 'fotos_invitados', amount: 0 }]), 'fotos_invitados')).toEqual({ ok: false, motivo: 'incluido' })
    expect(extraDisponible(atelier, 'cambio_modelo')).toEqual({ ok: true })
    expect(extraDisponible(firma, 'cambio_modelo')).toEqual({ ok: false, motivo: 'incluido' })
    expect(extraDisponible(aplicarExtras(firma, [{ effect: 'dia_d', amount: 0 }]), 'dia_d')).toEqual({ ok: false, motivo: 'incluido' })
  })

  it('sumar a lo que no tiene límite no tiene sentido', () => {
    expect(extraDisponible(alta, 'mas_grupos')).toEqual({ ok: false, motivo: 'incluido' })
    expect(extraDisponible(alta, 'sumar_planner')).toEqual({ ok: false, motivo: 'incluido' })
    expect(extraDisponible(firma, 'mas_grupos')).toEqual({ ok: true })
    expect(extraDisponible(atelier, 'sumar_planner')).toEqual({ ok: true })
  })

  it('lo que suma y el servicio se venden siempre', () => {
    for (const a of [atelier, firma, alta]) {
      expect(extraDisponible(a, 'mas_porteros')).toEqual({ ok: true })
      expect(extraDisponible(a, 'mas_dias')).toEqual({ ok: true })
      expect(extraDisponible(a, 'servicio')).toEqual({ ok: true })
    }
  })
})

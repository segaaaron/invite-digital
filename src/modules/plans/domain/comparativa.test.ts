import { describe, expect, it } from 'vitest'
import type { Allowance } from './allowance'
import { filasComparativas, type TextosComparativa } from './comparativa'

const TEXTOS: TextosComparativa = {
  si: 'Sí',
  no: 'No',
  sinLimite: 'Sin límite',
  hasta: 'Hasta {n}',
  dias: '{n} días',
  filas: {
    grupos: 'Grupos de invitados',
    fotos: 'Fotos del evento',
    fotosInvitados: 'Fotos de los invitados',
    contrasena: 'Contraseña',
    csv: 'Importar la lista',
    mesas: 'Mesas',
    regalos: 'Mesa de regalos',
    puerta: 'Puerta con QR',
    porteros: 'Porteros',
    coanfitriones: 'Co-anfitriones',
    planners: 'Planner contratado',
    tareas: 'Tareas y presupuesto',
    plannerCompleto: 'Proveedores y cronograma',
    plannerTotal: 'Día D',
    enLinea: 'En línea tras el evento',
    modelo: 'Cambiar de modelo',
  },
  modelo: { ninguno: 'No', antes_de_repartir: 'Hasta repartir', siempre: 'Siempre' },
}

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

const alta: Allowance = { ...atelier, planSlug: 'alta', maxGuestGroups: null, maxGalleryPhotos: null, checkin: true, maxDoorPorters: 10, maxCohosts: null, maxHiredPlanners: null, onlineDays: 365, designChange: 'siempre', plannerSuite: 'total' }

describe('filasComparativas', () => {
  it('cada fila dice el valor de cada plan, en el orden de los planes', () => {
    const filas = filasComparativas([atelier, alta], TEXTOS)
    const de = (etiqueta: string) => filas.find((f) => f.etiqueta === etiqueta)?.valores.map((v) => v.texto)

    expect(de('Grupos de invitados')).toEqual(['Hasta 40', 'Sin límite'])
    expect(de('Fotos del evento')).toEqual(['Hasta 8', 'Sin límite'])
    expect(de('Puerta con QR')).toEqual(['No', 'Sí'])
    expect(de('Porteros')).toEqual(['No', 'Hasta 10'])
    expect(de('Planner contratado')).toEqual(['No', 'Sin límite'])
    expect(de('Tareas y presupuesto')).toEqual(['Sí', 'Sí'])
    expect(de('Día D')).toEqual(['No', 'Sí'])
    expect(de('En línea tras el evento')).toEqual(['60 días', '365 días'])
    expect(de('Cambiar de modelo')).toEqual(['No', 'Siempre'])
  })

  // Lo que no trae se marca apagado: la tabla se lee por columnas y el «no» tiene que verse.
  it('marca como no incluido lo que el plan no trae', () => {
    const filas = filasComparativas([atelier], TEXTOS)
    const incluido = (etiqueta: string) => filas.find((f) => f.etiqueta === etiqueta)?.valores[0]?.incluido

    expect(incluido('Mesa de regalos')).toBe(false)
    expect(incluido('Porteros')).toBe(false)
    expect(incluido('Cambiar de modelo')).toBe(false)
    expect(incluido('Mesas')).toBe(true)
  })

  it('no se deja ninguna fila de lo que el plan limita', () => {
    expect(filasComparativas([atelier], TEXTOS)).toHaveLength(Object.keys(TEXTOS.filas).length)
  })
})

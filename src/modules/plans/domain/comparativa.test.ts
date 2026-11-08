import { describe, expect, it } from 'vitest'
import type { Allowance } from './allowance'
import { conPreciosDeExtras, filasComparativas, type TextosComparativa } from './comparativa'

const TEXTOS: TextosComparativa = {
  si: 'Sí',
  no: 'No',
  sinLimite: 'Sin límite',
  hasta: 'Hasta {n}',
  dias: '{n} días',
  filas: {
    grupos: 'Invitaciones',
    fotos: 'Fotos del evento',
    fotosInvitados: 'Fotos de los invitados',
    contrasena: 'Contraseña',
    csv: 'Importar la lista',
    mesas: 'Mesas',
    regalos: 'Mesa de regalos',
    formas: 'Sobres y QR',
    libro: 'Libro de firmas',
    estilo: 'Colores y letra',
    puerta: 'Puerta con QR',
    porteros: 'Recepción',
    planners: 'Planner contratado',
    tareas: 'Tareas y presupuesto',
    plannerCompleto: 'Proveedores y cronograma',
    plannerTotal: 'Día D',
    recordatorios: 'Recordatorios',
    rondas: 'Rondas',
    entrega: 'Lista en',
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

    expect(de('Invitaciones')).toEqual(['Hasta 40', 'Sin límite'])
    expect(de('Fotos del evento')).toEqual(['Hasta 8', 'Sin límite'])
    expect(de('Puerta con QR')).toEqual(['No', 'Sí'])
    expect(de('Recepción')).toEqual(['No', 'Hasta 10'])
    expect(de('Planner contratado')).toEqual(['No', 'Sin límite'])
    expect(de('Tareas y presupuesto')).toEqual(['Sí', 'Sí'])
    expect(de('Día D')).toEqual(['No', 'Sí'])
    expect(de('En línea tras el evento')).toEqual(['60 días', '365 días'])
    expect(de('Cambiar de modelo')).toEqual(['No', 'Siempre'])
  })

  // Las tres filas que el documento del 30 oct sumó a la tabla. Las dos de la entrega salen de la
  // base —la tarjeta del plan pinta esos mismos números—, y los recordatorios de su bandera.
  it('la entrega y los recordatorios salen de los datos del plan, no de un texto', () => {
    const conEncargo: Allowance = { ...atelier, correctionRounds: 2, deliveryDays: 3, reminders: false }
    const imperial: Allowance = { ...alta, correctionRounds: 5, deliveryDays: 5, reminders: true }
    const filas = filasComparativas([conEncargo, imperial], TEXTOS)
    const de = (etiqueta: string) => filas.find((f) => f.etiqueta === etiqueta)?.valores.map((v) => v.texto)

    expect(de('Rondas')).toEqual(['2', '5'])
    expect(de('Lista en')).toEqual(['3 días', '5 días'])
    expect(de('Recordatorios')).toEqual(['No', 'Sí'])
  })

  // Un plan de autoservicio no tiene rondas ni plazo: la celda dice que no, no un número inventado.
  it('sin rondas ni días de entrega, la entrega queda marcada como no incluida', () => {
    const filas = filasComparativas([atelier], TEXTOS)
    const celda = (etiqueta: string) => filas.find((f) => f.etiqueta === etiqueta)?.valores[0]

    expect(celda('Rondas')).toEqual({ texto: 'No', incluido: false })
    expect(celda('Lista en')).toEqual({ texto: 'No', incluido: false })
  })

  // Lo que no trae se marca apagado: la tabla se lee por columnas y el «no» tiene que verse.
  it('marca como no incluido lo que el plan no trae', () => {
    const filas = filasComparativas([atelier], TEXTOS)
    const incluido = (etiqueta: string) => filas.find((f) => f.etiqueta === etiqueta)?.valores[0]?.incluido

    expect(incluido('Mesa de regalos')).toBe(false)
    expect(incluido('Recepción')).toBe(false)
    expect(incluido('Cambiar de modelo')).toBe(false)
    expect(incluido('Mesas')).toBe(true)
  })

  it('Luxury sale incluido solo en el plan que lo trae (ya resuelto con la config del asistente)', () => {
    const [fila] = filasComparativas([atelier, { ...alta, asistente: true }], { ...TEXTOS, filas: { luxury: 'Luxury' } })
    expect(fila?.valores.map((v) => v.incluido)).toEqual([false, true])
  })

  it('no se deja ninguna fila de lo que el plan limita', () => {
    expect(filasComparativas([atelier], TEXTOS)).toHaveLength(Object.keys(TEXTOS.filas).length)
  })
})

describe('conPreciosDeExtras', () => {
  const gala: Allowance = { ...atelier, planSlug: 'gala', plannerSuite: 'completo' }
  const imperial: Allowance = { ...alta, guestPhotos: true }
  const precios = [
    { fila: 'fotosInvitados', efecto: 'fotos_invitados', precio: 'Bs 150' },
    { fila: 'plannerTotal', efecto: 'dia_d', precio: 'Bs 150' },
  ] as const

  it('pone «+Bs 150» solo donde el extra se puede comprar: el Día D no se vende sobre Atelier', () => {
    const filas = conPreciosDeExtras(filasComparativas([atelier, gala, imperial], TEXTOS), [atelier, gala, imperial], precios)
    const de = (etiqueta: string) => filas.find((f) => f.etiqueta === etiqueta)?.valores.map((v) => v.texto)

    expect(de('Día D')).toEqual(['No', '+Bs 150', 'Sí'])
    expect(de('Fotos de los invitados')).toEqual(['+Bs 150', '+Bs 150', 'Sí'])
  })

  it('la nota de la fila acompaña al precio y al incluido', () => {
    const filas = conPreciosDeExtras(filasComparativas([atelier, imperial], TEXTOS), [atelier, imperial], precios, {
      fotosInvitados: { incluido: '✓ (hasta 1.000)', extra: '{precio} (hasta 500)' },
    })
    expect(filas.find((f) => f.etiqueta === 'Fotos de los invitados')?.valores.map((v) => v.texto)).toEqual(['+Bs 150 (hasta 500)', '✓ (hasta 1.000)'])
  })
})

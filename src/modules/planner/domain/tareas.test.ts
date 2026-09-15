import { describe, expect, it } from 'vitest'
import { avanceDeTareas, estadoDeTarea, etapasDe, filtrarTareas, restarMeses, sembrarTareas, type Tarea } from './tareas'

describe('restarMeses', () => {
  it('resta meses en el calendario, sin la zona del servidor', () => {
    expect(restarMeses('2027-05-15', 12)).toBe('2026-05-15')
    expect(restarMeses('2027-01-10', 2)).toBe('2026-11-10')
  })
  // 31 de marzo menos un mes no es 3 de marzo: es el último día de febrero.
  it('un día que no existe en el mes de destino cae al último del mes', () => {
    expect(restarMeses('2027-03-31', 1)).toBe('2027-02-28')
  })
})

describe('sembrarTareas', () => {
  it('la boda arranca a los 12 meses y la de XV a los 18', () => {
    expect(etapasDe('boda')[0]?.clave).toBe('m12')
    expect(etapasDe('xv')[0]?.clave).toBe('m18')
  })

  it('cada tarea lleva la fecha de su etapa, contada desde el evento', () => {
    const tareas = sembrarTareas('boda', '2027-05-15')
    expect(tareas.find((t) => t.stage === 'm12')?.dueDate).toBe('2026-05-15')
    expect(tareas.find((t) => t.stage === 'semana')?.dueDate).toBe('2027-05-08')
  })

  it('XV trae lo suyo —chambelanes, vals— y no habla de novios', () => {
    const titulos = sembrarTareas('xv', '2027-05-15').map((t) => t.title.toLowerCase())
    expect(titulos.some((t) => t.includes('chambelanes'))).toBe(true)
    expect(titulos.some((t) => t.includes('vals'))).toBe(true)
    expect(titulos.some((t) => t.includes('novi'))).toBe(false)
  })

  it('el orden es el de la plantilla, sin huecos', () => {
    const orden = sembrarTareas('boda', '2027-05-15').map((t) => t.sortOrder)
    expect(orden).toEqual(orden.map((_, i) => i))
  })
})

const tarea = (parcial: Partial<Tarea>): Tarea => ({
  id: 't',
  stage: 'm3',
  title: 'Tarea',
  dueDate: '2027-01-10',
  assignee: 'anfitrion',
  notes: null,
  doneAt: null,
  doneBy: null,
  sortOrder: 0,
  ...parcial,
})

describe('estadoDeTarea', () => {
  const hoy = '2027-01-10'
  it('hecha gana a todo', () => expect(estadoDeTarea(tarea({ dueDate: '2026-01-01', doneAt: new Date() }), hoy)).toBe('hecha'))
  it('vencida ayer está atrasada', () => expect(estadoDeTarea(tarea({ dueDate: '2027-01-09' }), hoy)).toBe('atrasada'))
  it('la de hoy no está atrasada: vence esta semana', () => expect(estadoDeTarea(tarea({ dueDate: hoy }), hoy)).toBe('semana'))
  it('dentro de siete días es de esta semana', () => expect(estadoDeTarea(tarea({ dueDate: '2027-01-17' }), hoy)).toBe('semana'))
  it('a ocho días está pendiente', () => expect(estadoDeTarea(tarea({ dueDate: '2027-01-18' }), hoy)).toBe('pendiente'))
  it('sin fecha, pendiente', () => expect(estadoDeTarea(tarea({ dueDate: null }), hoy)).toBe('pendiente'))
})

describe('filtrarTareas y avance', () => {
  const hoy = '2027-01-10'
  const lista = [
    tarea({ id: 'a', assignee: 'planner', dueDate: '2027-01-01' }),
    tarea({ id: 'b', assignee: 'anfitrion', dueDate: '2027-01-12' }),
    tarea({ id: 'c', assignee: 'anfitrion', dueDate: '2027-01-01', doneAt: new Date() }),
  ]

  it('«mías» son las del responsable de quien mira', () => {
    expect(filtrarTareas(lista, 'mias', { hoy, mias: 'anfitrion' }).map((t) => t.id)).toEqual(['b', 'c'])
  })
  it('«atrasadas» no incluye las hechas', () => {
    expect(filtrarTareas(lista, 'atrasadas', { hoy, mias: 'anfitrion' }).map((t) => t.id)).toEqual(['a'])
  })
  it('«esta semana» son las que vencen en siete días, sin las hechas', () => {
    expect(filtrarTareas(lista, 'semana', { hoy, mias: 'anfitrion' }).map((t) => t.id)).toEqual(['b'])
  })
  it('el avance es la parte hecha, redondeada; sin tareas, cero', () => {
    expect(avanceDeTareas(lista)).toBe(33)
    expect(avanceDeTareas([])).toBe(0)
  })
})

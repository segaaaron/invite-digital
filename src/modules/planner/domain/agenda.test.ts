import { describe, expect, it } from 'vitest'
import { componerAgenda, leerCita, proximasDeLaAgenda, semanasDelMes } from './agenda'
import type { Tarea } from './tareas'

const evento = { title: 'Boda de Ana', eventDate: '2026-12-12', rsvpDeadline: '2026-11-30', inicio: '2026-12-12T20:00:00' }
const tarea = (id: string, dueDate: string | null, hecha = false): Tarea => ({ id, stage: 'propias', title: `T${id}`, dueDate, assignee: 'anfitrion', notes: null, doneAt: hecha ? new Date() : null, doneBy: null, sortOrder: 0 })
const vacio = { tareas: [], partidas: [], momentos: [], ensayos: [], citas: [] }

describe('componerAgenda', () => {
  it('junta todo lo que tiene fecha, ordenado por día y hora, y deja fuera las tareas sin fecha', () => {
    const agenda = componerAgenda({
      ...vacio,
      evento,
      tareas: [tarea('1', '2026-10-01'), tarea('2', null)],
      partidas: [{ id: 'p', category: 'lugar', concept: 'Salón', estimatedCents: 0, contractedCents: null, payer: 'anfitriones', padrinoLabel: null, notes: null, pagos: [{ id: 'g', amountCents: 150000, dueDate: '2026-10-01', paidAt: null, label: 'anticipo' }] }] as never,
      citas: [{ id: 'c', title: 'Degustación', startsAt: '2026-10-01T16:30', durationMin: 90, place: 'Catering', vendorId: null, notes: null }],
    })
    expect(agenda.map((e) => e.id)).toEqual(['1', 'g', 'c', 'confirmacion', 'evento'])
    expect(agenda.find((e) => e.id === 'g')).toMatchObject({ titulo: 'Anticipo · Salón', detalle: 'Bs 1.500' })
    expect(agenda.at(-1)).toMatchObject({ hora: '20:00', minutos: 300 })
  })

  it('un momento de madrugada cae el día siguiente, y un ensayo se lee en hora de Bolivia', () => {
    const agenda = componerAgenda({
      ...vacio,
      evento,
      momentos: [{ id: 'm', startsAt: '00:30', durationMin: 20, title: 'Hora loca', place: null, owner: null, vendorIds: [], cue: null, notes: null, sortOrder: 0, enInvitacion: false }] as never,
      ensayos: [{ id: 'e', date: new Date('2026-12-11T23:00:00Z'), place: 'Iglesia', notes: null, asistentes: [] }],
    })
    expect(agenda.find((e) => e.id === 'm')).toMatchObject({ dia: '2026-12-13', hora: '00:30' })
    expect(agenda.find((e) => e.id === 'e')).toMatchObject({ dia: '2026-12-11', hora: '19:00' })
  })

  it('lo próximo no trae lo hecho ni lo pasado', () => {
    const agenda = componerAgenda({ ...vacio, evento, tareas: [tarea('a', '2026-10-02'), tarea('b', '2026-10-03', true), tarea('c', '2026-09-01')] })
    expect(proximasDeLaAgenda(agenda, '2026-10-01').map((e) => e.id)).toEqual(['a'])
  })
})

describe('semanasDelMes', () => {
  it('empieza en lunes y rellena con huecos', () => {
    const semanas = semanasDelMes('2026-10')
    expect(semanas[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(semanas.flat().filter(Boolean)).toHaveLength(31)
    expect(semanas.every((s) => s.length === 7)).toBe(true)
  })
})

describe('leerCita', () => {
  const base = { title: 'Prueba del vestido', dia: '2026-10-05', hora: '16:30', durationMin: '', place: '', vendorId: '', notes: '' }
  it('arma la hora de Bolivia y pone una hora por defecto', () => {
    expect(leerCita(base)).toEqual({ ok: true, valor: { title: 'Prueba del vestido', startsAt: '2026-10-05T16:30', durationMin: 60, place: null, vendorId: null, notes: null } })
  })
  it('rechaza sin nombre, sin hora o con una duración imposible', () => {
    expect(leerCita({ ...base, title: ' ' }).ok).toBe(false)
    expect(leerCita({ ...base, hora: '25:00' }).ok).toBe(false)
    expect(leerCita({ ...base, durationMin: '0' }).ok).toBe(false)
  })
})

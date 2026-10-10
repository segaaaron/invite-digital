import { describe, expect, it } from 'vitest'
import { atrasadasDeLaAgenda, avisosDeLaAgenda, componerAgenda, diasHasta, leerCita, proximasDeLaAgenda, semanasDelMes, type EntradaDeAgenda } from './agenda'
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

const entrada = (id: string, clase: EntradaDeAgenda['clase'], dia: string, extra: Partial<EntradaDeAgenda> = {}): EntradaDeAgenda => ({
  id, clase, dia, hora: null, minutos: null, titulo: id, detalle: null, hecha: false, ruta: `/${clase}`, ...extra,
})

describe('lo atrasado (9 oct)', () => {
  it('tareas y pagos de antes de hoy sin hacer, lo más viejo primero; lo hecho, las citas y el cronograma no', () => {
    const entradas = [
      entrada('menu', 'tarea', '2026-10-08'),
      entrada('foto', 'pago', '2026-10-07'),
      entrada('hecha', 'tarea', '2026-10-01', { hecha: true }),
      entrada('cita', 'cita', '2026-10-05'),
      entrada('hoy', 'tarea', '2026-10-09'),
    ]
    expect(atrasadasDeLaAgenda(entradas, '2026-10-09').map((e) => e.id)).toEqual(['foto', 'menu'])
  })
  it('días que faltan', () => {
    expect(diasHasta('2026-10-09', '2026-12-12')).toBe(64)
    expect(diasHasta('2026-10-09', '2026-10-09')).toBe(0)
  })
})

describe('los avisos de la agenda (9 oct: «notificaciones para las fechas»)', () => {
  const hoy = '2026-10-09'
  it('por la mañana, un solo resumen de lo de hoy (sin el cronograma ni lo hecho)', () => {
    const avisos = avisosDeLaAgenda(
      [
        entrada('Degustación', 'cita', hoy, { hora: '10:00' }),
        entrada('Llamar al DJ', 'tarea', hoy),
        entrada('Pagar flores', 'pago', hoy, { hecha: true }),
        entrada('Vals', 'momento', hoy, { hora: '21:00' }),
      ],
      hoy,
    )
    expect(avisos).toEqual([{ cuando: 'hoy', que: '10:00 Degustación · Llamar al DJ', ruta: '/planner/agenda' }])
  })
  it('lo de mañana, uno por cosa: citas con su hora, ensayos y el cierre de confirmaciones también', () => {
    const avisos = avisosDeLaAgenda(
      [
        entrada('Prueba del vestido', 'cita', '2026-10-10', { hora: '16:30', ruta: '/planner/agenda?cita=c' }),
        entrada('Ensayo del cortejo', 'ensayo', '2026-10-10', { hora: '19:00' }),
        entrada('Último día para confirmar', 'confirmacion', '2026-10-10'),
      ],
      hoy,
    )
    expect(avisos).toEqual([
      { cuando: 'mañana', que: '16:30 Prueba del vestido', ruta: '/planner/agenda?cita=c' },
      { cuando: 'mañana', que: '19:00 Ensayo del cortejo', ruta: '/ensayo' },
      { cuando: 'mañana', que: 'Último día para confirmar', ruta: '/confirmacion' },
    ])
  })
  it('lo que venció ayer, una vez; y la cuenta del evento a 30 y 7 días, la víspera y el día', () => {
    expect(avisosDeLaAgenda([entrada('Pagar al fotógrafo', 'pago', '2026-10-08')], hoy)).toEqual([{ cuando: 'atrasado', que: 'Pagar al fotógrafo', ruta: '/pago' }])
    expect(avisosDeLaAgenda([entrada('Pagar al fotógrafo', 'pago', '2026-10-01')], hoy)).toEqual([])
    const delEvento = (dia: string) => avisosDeLaAgenda([entrada('Boda', 'evento', dia, { ruta: '' })], hoy)
    expect(delEvento('2026-11-08')).toEqual([{ cuando: 'en 30 días', que: 'tu evento', ruta: '' }])
    expect(delEvento('2026-10-16')).toEqual([{ cuando: 'en 7 días', que: 'tu evento', ruta: '' }])
    expect(delEvento('2026-10-10')).toEqual([{ cuando: 'mañana', que: 'es tu evento', ruta: '' }])
    expect(delEvento(hoy)).toEqual([{ cuando: 'hoy', que: 'es tu evento', ruta: '' }])
  })
  it('un pago lleva su importe: dos cuotas del mismo día no se toman por el mismo aviso (QA 9 oct)', () => {
    const avisos = avisosDeLaAgenda(
      [entrada('a', 'pago', '2026-10-10', { titulo: 'Cuota · Fotógrafo', detalle: 'Bs 1.500' }), entrada('b', 'pago', '2026-10-10', { titulo: 'Cuota · Fotógrafo', detalle: 'Bs 3.000' })],
      hoy,
    )
    expect(avisos.map((a) => a.que)).toEqual(['Cuota · Fotógrafo (Bs 1.500)', 'Cuota · Fotógrafo (Bs 3.000)'])
  })
  it('un día con mucho resume y dice cuántas más', () => {
    const muchas = ['A', 'B', 'C', 'D', 'E'].map((t) => entrada(t, 'tarea', hoy))
    expect(avisosDeLaAgenda(muchas, hoy)[0]!.que).toBe('A · B · C y 2 más')
  })
})

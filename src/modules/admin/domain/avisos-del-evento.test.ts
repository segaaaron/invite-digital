import { describe, expect, it } from 'vitest'
import { avisosDeHoy, type EventoParaAvisar } from './avisos-del-evento'

const HOY = '2026-09-28'
const base: EventoParaAvisar = {
  fiesta: 'boda',
  eventDate: '2026-11-21',
  rsvpDeadline: '2026-10-31',
  invitacionEscrita: false,
  grupos: 0,
  enviados: 0,
  respondidos: 0,
  yaEnviados: new Set(),
}

describe('avisosDeHoy', () => {
  it('a ocho semanas de una boda sin escribir, recuerda escribirla; una vez', () => {
    expect(avisosDeHoy(base, HOY)).toEqual(['hito-escribir'])
    expect(avisosDeHoy({ ...base, yaEnviados: new Set(['hito-escribir']) }, HOY)).toEqual([])
    expect(avisosDeHoy({ ...base, eventDate: '2027-03-01' }, HOY)).toEqual([])
  })

  it('escrita y sin repartir a seis semanas, empuja el reparto', () => {
    expect(avisosDeHoy({ ...base, eventDate: '2026-11-05', invitacionEscrita: true, grupos: 40, enviados: 5 }, HOY)).toEqual(['hito-repartir'])
  })

  it('a una semana del cierre con pocas respuestas, avisa', () => {
    const e = { ...base, eventDate: '2026-10-20', rsvpDeadline: '2026-10-03', invitacionEscrita: true, grupos: 30, enviados: 30, respondidos: 10 }
    expect(avisosDeHoy(e, HOY)).toEqual(['rsvp-bajo'])
  })

  it('pide la opinión unos días después y felicita al año', () => {
    expect(avisosDeHoy({ ...base, eventDate: '2026-09-23' }, HOY)).toEqual(['encuesta'])
    expect(avisosDeHoy({ ...base, eventDate: '2026-09-27' }, HOY)).toEqual([])
    expect(avisosDeHoy({ ...base, eventDate: '2025-09-25' }, HOY)).toEqual(['aniversario'])
  })
})

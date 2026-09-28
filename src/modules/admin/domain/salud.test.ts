import { describe, expect, it } from 'vitest'
import { saludDelEvento, type EventoDeSalud } from './salud'

const HOY = '2026-09-28'
const base: EventoDeSalud = {
  fiesta: 'boda',
  eventDate: '2027-02-14',
  rsvpDeadline: '2027-01-24',
  grupos: 0,
  enviados: 0,
  respondidos: 0,
  invitacionEscrita: false,
  clienteSinEntrar: false,
  saldoPendiente: false,
}

describe('saludDelEvento', () => {
  it('lejos de la fecha, sin escribir no es un riesgo todavía', () => {
    expect(saludDelEvento(base, HOY).tono).toBe('ok')
  })

  it('una boda sin escribir a diez semanas es riesgo; unos XV a esa distancia, todavía no', () => {
    const cerca = { ...base, eventDate: '2026-12-01', rsvpDeadline: '2026-11-10' }
    expect(saludDelEvento(cerca, HOY)).toMatchObject({ tono: 'risk', texto: 'Invitación sin escribir · faltan 64 días' })
    expect(saludDelEvento({ ...cerca, fiesta: 'xv' }, HOY).tono).toBe('ok')
  })

  it('a seis semanas, repartir menos de la mitad es riesgo, y lo dice con cifras', () => {
    const s = saludDelEvento({ ...base, eventDate: '2026-11-05', invitacionEscrita: true, grupos: 40, enviados: 10 }, HOY)
    expect(s.texto).toBe('Solo 10 de 40 invitaciones enviadas · faltan 38 días')
  })

  it('pasado el cierre con pocas respuestas avisa; con cliente sin entrar también; lo grave va primero', () => {
    const s = saludDelEvento(
      { ...base, eventDate: '2026-10-12', rsvpDeadline: '2026-09-20', invitacionEscrita: true, grupos: 20, enviados: 20, respondidos: 8, clienteSinEntrar: true },
      HOY,
    )
    expect(s.tono).toBe('warn')
    expect(s.alertas.map((a) => a.clave)).toEqual(['rsvp', 'sin-entrar'])
    expect(s.texto).toBe('Cerró la confirmación y respondió el 40 %')
  })

  it('al día dice cuánto respondió; celebrado, nada', () => {
    expect(saludDelEvento({ ...base, eventDate: '2026-10-12', invitacionEscrita: true, grupos: 8, enviados: 8, respondidos: 7 }, HOY).texto).toBe('Al día · respondió el 88 %')
    expect(saludDelEvento({ ...base, eventDate: '2026-09-01' }, HOY)).toEqual({ tono: 'ok', texto: 'Celebrado', alertas: [] })
  })
})

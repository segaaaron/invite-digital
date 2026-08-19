import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createRsvpResponse } from './rsvp-response'

const base = {
  id: 'r1',
  guestGroupId: 'g1',
  attending: 3,
  message: null,
  respondedAt: new Date('2026-08-19T12:00:00Z'),
}

describe('createRsvpResponse', () => {
  it('acepta confirmar menos cupos de los asignados', () => {
    expect(isOk(createRsvpResponse(base, { seats: 4 }))).toBe(true)
  })

  it('acepta cero: no asistir es una respuesta, no un silencio', () => {
    expect(isOk(createRsvpResponse({ ...base, attending: 0 }, { seats: 4 }))).toBe(true)
  })

  it('acepta llenar todos los cupos', () => {
    expect(isOk(createRsvpResponse({ ...base, attending: 4 }, { seats: 4 }))).toBe(true)
  })

  it('rechaza confirmar más cupos de los asignados', () => {
    const result = createRsvpResponse({ ...base, attending: 5 }, { seats: 4 })
    expect(isErr(result) && result.error.kind).toBe('too_many_seats')
  })

  it('rechaza un número negativo o fraccionario', () => {
    expect(isErr(createRsvpResponse({ ...base, attending: -1 }, { seats: 4 }))).toBe(true)
    expect(isErr(createRsvpResponse({ ...base, attending: 1.5 }, { seats: 4 }))).toBe(true)
  })

  it('recorta el mensaje y lo deja en null si queda vacío', () => {
    const result = createRsvpResponse({ ...base, message: '   ' }, { seats: 4 })
    expect(isOk(result) && result.value.message).toBeNull()
  })

  it('rechaza un mensaje de más de 500 caracteres', () => {
    const result = createRsvpResponse({ ...base, message: 'x'.repeat(501) }, { seats: 4 })
    expect(isErr(result) && result.error.kind).toBe('invalid_payload')
  })
})

import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createConsultation } from './consultation'

const now = new Date('2026-08-18T12:00:00Z')

const base = {
  name: 'María Rojas',
  email: 'maria@example.com',
  phone: '',
  categorySlug: 'boda',
  eventDate: '2026-12-05',
  message: 'Boda en Cochabamba',
  locale: 'es' as const,
}

describe('createConsultation', () => {
  it('acepta una consulta con email', () => {
    expect(isOk(createConsultation(base, now))).toBe(true)
  })

  it('acepta una consulta solo con teléfono', () => {
    const result = createConsultation({ ...base, email: '', phone: '+591 700 11223' }, now)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.phone).toBe('+59170011223')
  })

  it('rechaza una consulta sin ningún contacto', () => {
    const result = createConsultation({ ...base, email: '', phone: '' }, now)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('missing_contact')
  })

  it('rechaza un nombre vacío', () => {
    const result = createConsultation({ ...base, name: '   ' }, now)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_name')
  })

  it('rechaza un email con forma inválida', () => {
    const result = createConsultation({ ...base, email: 'maria@example' }, now)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_email')
  })

  it('rechaza una fecha que no existe en el calendario', () => {
    const result = createConsultation({ ...base, eventDate: '2026-02-31' }, now)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_event_date')
  })

  it('rechaza una fecha con formato inválido', () => {
    const result = createConsultation({ ...base, eventDate: '2026' }, now)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('invalid_event_date')
  })

  it('rechaza una fecha de evento en el pasado', () => {
    const result = createConsultation({ ...base, eventDate: '2026-08-17' }, now)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('past_event_date')
  })

  it('acepta el mismo día del evento', () => {
    expect(isOk(createConsultation({ ...base, eventDate: '2026-08-18' }, now))).toBe(true)
  })

  it('acepta una consulta sin fecha', () => {
    expect(isOk(createConsultation({ ...base, eventDate: '' }, now))).toBe(true)
  })
})

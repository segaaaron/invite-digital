import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { acceptsResponses, createEvent } from './event'

const base = {
  id: 'e1',
  slug: 'boda-ana-y-luis',
  title: 'Boda de Ana y Luis',
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
  retentionDays: 90,
}

const built = (overrides: Partial<typeof base> = {}) => {
  const result = createEvent({ ...base, ...overrides })
  if (isErr(result)) throw new Error(`el evento de prueba no se construyó: ${result.error.detail}`)
  return result.value
}

describe('createEvent', () => {
  it('construye un evento válido', () => {
    expect(isOk(createEvent(base))).toBe(true)
  })

  it('rechaza un slug con mayúsculas o espacios', () => {
    const result = createEvent({ ...base, slug: 'Boda Ana' })
    expect(isErr(result) && result.error.kind).toBe('invalid_slug')
  })

  it('rechaza una fecha límite posterior al evento', () => {
    const result = createEvent({ ...base, rsvpDeadline: '2026-12-06' })
    expect(isErr(result) && result.error.kind).toBe('deadline_after_event')
  })

  it('acepta que la fecha límite sea el mismo día del evento', () => {
    expect(isOk(createEvent({ ...base, rsvpDeadline: '2026-12-05' }))).toBe(true)
  })

  it('rechaza una fecha que no es ISO', () => {
    const result = createEvent({ ...base, eventDate: '05/12/2026' })
    expect(isErr(result) && result.error.kind).toBe('invalid_date')
  })

  it('rechaza un idioma que no existe', () => {
    const result = createEvent({ ...base, locale: 'pt' })
    expect(isErr(result) && result.error.kind).toBe('invalid_locale')
  })

  it('rechaza un estado desconocido', () => {
    const result = createEvent({ ...base, status: 'publicado' })
    expect(isErr(result) && result.error.kind).toBe('invalid_status')
  })

  it('rechaza una retención de cero días o negativa', () => {
    expect(isErr(createEvent({ ...base, retentionDays: 0 }))).toBe(true)
    expect(isErr(createEvent({ ...base, retentionDays: -5 }))).toBe(true)
  })

  it('recorta el título y rechaza el vacío', () => {
    expect(built({ title: '  Boda  ' }).title).toBe('Boda')
    expect(isErr(createEvent({ ...base, title: '   ' }))).toBe(true)
  })
})

describe('acceptsResponses', () => {
  it('acepta antes de la fecha límite y en el propio día', () => {
    expect(acceptsResponses(built(), '2026-11-19')).toBe(true)
    expect(acceptsResponses(built(), '2026-11-20')).toBe(true)
  })

  it('cierra al día siguiente de la fecha límite', () => {
    expect(acceptsResponses(built(), '2026-11-21')).toBe(false)
  })

  it('no acepta si el evento está en borrador o cerrado', () => {
    expect(acceptsResponses(built({ status: 'draft' }), '2026-11-19')).toBe(false)
    expect(acceptsResponses(built({ status: 'closed' }), '2026-11-19')).toBe(false)
  })
})

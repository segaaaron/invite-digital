import { describe, expect, it } from 'vitest'
import { formatEventDate } from './format'

describe('formatEventDate', () => {
  it('formatea en español boliviano', () => {
    expect(formatEventDate(new Date('2026-10-12T12:00:00Z'), 'es')).toBe('12 de octubre de 2026')
  })

  it('formatea en inglés', () => {
    expect(formatEventDate(new Date('2026-10-12T12:00:00Z'), 'en')).toBe('October 12, 2026')
  })
})

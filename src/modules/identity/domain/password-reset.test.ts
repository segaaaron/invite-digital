import { describe, expect, it } from 'vitest'
import {
  canAttemptReset,
  MAX_OTP_ATTEMPTS,
  newOtp,
  normalizeOtp,
  OTP_LENGTH,
  otpExpiry,
  OTP_TTL_MS,
} from './password-reset'

const AHORA = new Date('2026-09-14T12:00:00Z')

describe('newOtp', () => {
  it('son seis dígitos, con los ceros a la izquierda', () => {
    // Componerlo con `String(randomInt(1_000_000))` daría códigos de cinco cifras cuando
    // saliera un número bajo, y el campo del formulario pide seis.
    for (let i = 0; i < 200; i += 1) {
      expect(newOtp()).toMatch(new RegExp(`^\\d{${OTP_LENGTH}}$`))
    }
  })

  it('no repite siempre el mismo', () => {
    const vistos = new Set(Array.from({ length: 50 }, () => newOtp()))
    expect(vistos.size).toBeGreaterThan(1)
  })
})

describe('normalizeOtp', () => {
  it('admite lo que teclea un humano', () => {
    expect(normalizeOtp(' 123 456 ')).toBe('123456')
    expect(normalizeOtp('123-456')).toBe('123456')
  })

  it('y rechaza lo que no es un código', () => {
    expect(normalizeOtp('12345')).toBeNull()
    expect(normalizeOtp('1234567')).toBeNull()
    expect(normalizeOtp('12345a')).toBeNull()
    expect(normalizeOtp('')).toBeNull()
  })
})

describe('otpExpiry', () => {
  it('caduca a los diez minutos', () => {
    expect(otpExpiry(AHORA).getTime()).toBe(AHORA.getTime() + OTP_TTL_MS)
  })
})

describe('canAttemptReset', () => {
  const vivo = { expiresAt: new Date(AHORA.getTime() + 60_000), consumedAt: null, attempts: 0 }

  it('un código vivo admite intento', () => {
    expect(canAttemptReset(vivo, AHORA)).toBe(true)
  })

  it('uno ya gastado no vale una segunda vez', () => {
    // Es lo que impide que quien vio el correo lo reutilice después de que el dueño ya
    // cambiara la contraseña.
    expect(canAttemptReset({ ...vivo, consumedAt: AHORA }, AHORA)).toBe(false)
  })

  it('uno caducado tampoco, ni justo al vencer', () => {
    expect(canAttemptReset({ ...vivo, expiresAt: AHORA }, AHORA)).toBe(false)
    expect(canAttemptReset({ ...vivo, expiresAt: new Date(AHORA.getTime() - 1) }, AHORA)).toBe(false)
  })

  it('y se agota a los cinco intentos', () => {
    expect(canAttemptReset({ ...vivo, attempts: MAX_OTP_ATTEMPTS - 1 }, AHORA)).toBe(true)
    expect(canAttemptReset({ ...vivo, attempts: MAX_OTP_ATTEMPTS }, AHORA)).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './rate-limit'

describe('createRateLimiter', () => {
  it('permite hasta el máximo de intentos por ventana', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 })
    expect(limiter.isLimited('1.1.1.1', 0)).toBe(false)
    expect(limiter.isLimited('1.1.1.1', 100)).toBe(false)
    expect(limiter.isLimited('1.1.1.1', 200)).toBe(false)
    expect(limiter.isLimited('1.1.1.1', 300)).toBe(true)
  })

  it('cuenta cada clave por separado', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 })
    expect(limiter.isLimited('1.1.1.1', 0)).toBe(false)
    expect(limiter.isLimited('2.2.2.2', 0)).toBe(false)
    expect(limiter.isLimited('1.1.1.1', 1)).toBe(true)
  })

  it('olvida los intentos fuera de la ventana', () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 1 })
    expect(limiter.isLimited('1.1.1.1', 0)).toBe(false)
    expect(limiter.isLimited('1.1.1.1', 500)).toBe(true)
    expect(limiter.isLimited('1.1.1.1', 1_600)).toBe(false)
  })
})

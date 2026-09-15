import { describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { leadError } from '../domain/errors'
import { guardedSubmit } from './guarded-submit'
import { createRateLimiter } from '@/shared/http/rate-limit'

const payload = { name: 'María Rojas', email: 'maria@example.com', locale: 'es' }

const deps = (overrides: Partial<Parameters<typeof guardedSubmit>[0]> = {}) => ({
  limiter: createRateLimiter({ windowMs: 60_000, max: 3 }),
  submit: vi.fn().mockResolvedValue(ok({ ok: true as const })),
  clock: () => 0,
  log: vi.fn(),
  ...overrides,
})

describe('guardedSubmit', () => {
  it('devuelve éxito sin mensaje cuando la consulta se guarda', async () => {
    const d = deps()
    await expect(guardedSubmit(d)({ ip: '1.1.1.1', payload })).resolves.toEqual({ status: 'success', message: '' })
    expect(d.submit).toHaveBeenCalledWith(payload)
  })

  it('bloquea a partir del cuarto intento de la misma IP sin llamar al caso de uso', async () => {
    const d = deps()
    const run = guardedSubmit(d)
    for (let i = 0; i < 3; i += 1) {
      expect((await run({ ip: '1.1.1.1', payload })).status).toBe('success')
    }

    await expect(run({ ip: '1.1.1.1', payload })).resolves.toEqual({
      status: 'error',
      message: 'too_many_requests',
    })
    expect(d.submit).toHaveBeenCalledTimes(3)
  })

  it('no mezcla el cupo de dos IP distintas', async () => {
    const d = deps({ limiter: createRateLimiter({ windowMs: 60_000, max: 1 }) })
    const run = guardedSubmit(d)
    await run({ ip: '1.1.1.1', payload })

    expect((await run({ ip: '2.2.2.2', payload })).status).toBe('success')
  })

  it('devuelve solo el kind al cliente y deja el detalle en el log', async () => {
    const d = deps({
      submit: vi.fn().mockResolvedValue(err(leadError('invalid_email', 'Email inválido: maria@example'))),
    })

    await expect(guardedSubmit(d)({ ip: '1.1.1.1', payload })).resolves.toEqual({
      status: 'error',
      message: 'invalid_email',
    })
    expect(d.log).toHaveBeenCalledWith('consulta rechazada', 'invalid_email', 'Email inválido: maria@example')
  })
})

import { describe, expect, it } from 'vitest'
import { guardedUnlock } from './guarded-unlock'
import { createRateLimiter } from '@/modules/leads/application/rate-limit'

const siempreCorrecta = async () => true
const siempreIncorrecta = async () => false

describe('guardedUnlock', () => {
  it('deja pasar la contraseña correcta', async () => {
    const abrir = guardedUnlock({
      limiter: createRateLimiter({ windowMs: 60_000, max: 5 }),
      check: siempreCorrecta,
      clock: () => 0,
    })

    expect(await abrir({ ip: '1.2.3.4', eventId: 'e1', password: 'buena' })).toEqual({ status: 'ok' })
  })

  it('corta la fuerza bruta por IP tras cinco intentos en el minuto', async () => {
    // Es un extremo público, sin sesión, contra una contraseña de seis caracteres. Sin
    // límite, probarlas todas es cuestión de tiempo — y cada intento cuesta un argon2,
    // así que además es un vector de CPU.
    let ahora = 0
    const abrir = guardedUnlock({
      limiter: createRateLimiter({ windowMs: 60_000, max: 5 }),
      check: siempreIncorrecta,
      clock: () => ahora,
    })

    for (let i = 0; i < 5; i += 1) {
      expect((await abrir({ ip: '1.2.3.4', eventId: 'e1', password: 'x' })).status).toBe('invalid')
    }

    expect((await abrir({ ip: '1.2.3.4', eventId: 'e1', password: 'x' })).status).toBe('rate_limited')

    // Pasado el minuto vuelve a admitir intentos.
    ahora = 61_000
    expect((await abrir({ ip: '1.2.3.4', eventId: 'e1', password: 'x' })).status).toBe('invalid')
  })

  it('cuenta también por evento: cambiar de IP no reinicia el contador', async () => {
    // Un ataque distribuido cambia de IP en cada intento; el evento es el que hay que
    // proteger.
    const abrir = guardedUnlock({
      limiter: createRateLimiter({ windowMs: 60_000, max: 100 }),
      eventLimiter: createRateLimiter({ windowMs: 60_000, max: 3 }),
      check: siempreIncorrecta,
      clock: () => 0,
    })

    for (let i = 0; i < 3; i += 1) {
      expect((await abrir({ ip: `10.0.0.${i}`, eventId: 'e1', password: 'x' })).status).toBe('invalid')
    }

    expect((await abrir({ ip: '10.0.0.9', eventId: 'e1', password: 'x' })).status).toBe('rate_limited')
    // Otro evento no queda bloqueado por el primero.
    expect((await abrir({ ip: '10.0.0.9', eventId: 'e2', password: 'x' })).status).toBe('invalid')
  })

  it('no gasta un argon2 cuando ya está limitado', async () => {
    let comprobaciones = 0
    const abrir = guardedUnlock({
      limiter: createRateLimiter({ windowMs: 60_000, max: 1 }),
      check: async () => {
        comprobaciones += 1
        return false
      },
      clock: () => 0,
    })

    await abrir({ ip: '1.2.3.4', eventId: 'e1', password: 'x' })
    await abrir({ ip: '1.2.3.4', eventId: 'e1', password: 'x' })

    expect(comprobaciones).toBe(1)
  })
})

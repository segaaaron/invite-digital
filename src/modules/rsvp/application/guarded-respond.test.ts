import { describe, expect, it } from 'vitest'
import { err, ok } from '@/shared/result'
import { rsvpError } from '../domain/errors'
import { guardedRespond } from './guarded-respond'

const limiter = (limited: boolean) => ({ isLimited: () => limited })
const noop = () => {}

const respuesta = ok({
  id: 'r1',
  guestGroupId: 'g1',
  attending: 3,
  message: null,
  respondedAt: new Date('2026-10-01T12:00:00Z'),
})

describe('guardedRespond', () => {
  it('corta antes de tocar la base cuando la IP está limitada', async () => {
    let llamadas = 0
    const result = await guardedRespond({
      limiter: limiter(true),
      respond: async () => {
        llamadas += 1
        return respuesta
      },
      clock: () => 0,
      log: noop,
    })({ ip: '1.2.3.4', token: 'tok', payload: { attending: '3' } })

    expect(result).toEqual({ status: 'error', message: 'rate_limited' })
    expect(llamadas).toBe(0)
  })

  it('acepta un cero: es la respuesta "no vamos"', async () => {
    const result = await guardedRespond({
      limiter: limiter(false),
      respond: async () => ok({ ...respuesta.value, attending: 0 }),
      clock: () => 0,
      log: noop,
    })({ ip: '1.2.3.4', token: 'tok', payload: { attending: '0' } })

    expect(result).toEqual({ status: 'success', attending: 0 })
  })

  it('rechaza el campo vacío, que no es lo mismo que un cero', async () => {
    const result = await guardedRespond({ limiter: limiter(false), respond: async () => respuesta, clock: () => 0, log: noop })({
      ip: '1.2.3.4',
      token: 'tok',
      payload: { attending: '' },
    })
    expect(result).toEqual({ status: 'error', message: 'invalid_payload' })
  })

  it('rechaza un cuerpo sin el campo', async () => {
    const result = await guardedRespond({ limiter: limiter(false), respond: async () => respuesta, clock: () => 0, log: noop })({
      ip: '1.2.3.4',
      token: 'tok',
      payload: {},
    })
    expect(result).toEqual({ status: 'error', message: 'invalid_payload' })
  })

  it('devuelve el kind del error, nunca su detalle', async () => {
    const result = await guardedRespond({
      limiter: limiter(false),
      respond: async () => err(rsvpError('rsvp_closed', 'Evento boda-ana cerrado el 2026-11-20')),
      clock: () => 0,
      log: noop,
    })({ ip: '1.2.3.4', token: 'tok', payload: { attending: '3' } })

    expect(result).toEqual({ status: 'error', message: 'rsvp_closed' })
  })
})

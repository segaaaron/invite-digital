import { describe, expect, it } from 'vitest'
import { err, ok } from '@/shared/result'
import { identityError } from '../domain/errors'
import { guardedSignIn } from './guarded-sign-in'

const limiter = (limited: boolean) => ({ isLimited: () => limited })
const success = async () => ok({ token: 'tok', expiresAt: new Date('2026-09-19T00:00:00Z') })
const noop = () => {}
const payload = { email: 'a@b.bo', password: 'contrasena-larga-1' }

describe('guardedSignIn', () => {
  it('corta antes de tocar la base cuando la IP está limitada', async () => {
    let llamadas = 0
    const result = await guardedSignIn({
      ipLimiter: limiter(true),
      accountLimiter: limiter(false),
      signIn: async () => {
        llamadas += 1
        return ok({ token: 't', expiresAt: new Date() })
      },
      clock: () => 0,
      log: noop,
    })({ ip: '1.2.3.4', payload })

    expect(result).toEqual({ status: 'error', message: 'too_many_attempts' })
    expect(llamadas).toBe(0)
  })

  it('limita también por cuenta, para que rotar IP no sirva', async () => {
    const result = await guardedSignIn({
      ipLimiter: limiter(false),
      accountLimiter: limiter(true),
      signIn: success,
      clock: () => 0,
      log: noop,
    })({ ip: '1.2.3.4', payload })
    expect(result).toEqual({ status: 'error', message: 'too_many_attempts' })
  })

  it('devuelve el token cuando las credenciales sirven', async () => {
    const result = await guardedSignIn({ ipLimiter: limiter(false), accountLimiter: limiter(false), signIn: success, clock: () => 0, log: noop })({
      ip: '1.2.3.4',
      payload,
    })
    expect(result.status).toBe('success')
  })

  it('no filtra el detalle del error al cliente', async () => {
    const result = await guardedSignIn({
      ipLimiter: limiter(false),
      accountLimiter: limiter(false),
      signIn: async () => err(identityError('invalid_credentials', 'clave mala de a@b.bo')),
      clock: () => 0,
      log: noop,
    })({ ip: '1.2.3.4', payload })
    expect(result).toEqual({ status: 'error', message: 'invalid_credentials' })
  })

  it('distingue el fallo de almacenamiento de las credenciales malas', async () => {
    const result = await guardedSignIn({
      ipLimiter: limiter(false),
      accountLimiter: limiter(false),
      signIn: async () => err(identityError('storage_failure', 'base caída')),
      clock: () => 0,
      log: noop,
    })({ ip: '1.2.3.4', payload })
    expect(result).toEqual({ status: 'error', message: 'storage_failure' })
  })

  it('rechaza un cuerpo que no es un formulario válido', async () => {
    const result = await guardedSignIn({ ipLimiter: limiter(false), accountLimiter: limiter(false), signIn: success, clock: () => 0, log: noop })({
      ip: '1.2.3.4',
      payload: { email: 5 },
    })
    expect(result).toEqual({ status: 'error', message: 'invalid_credentials' })
  })
})

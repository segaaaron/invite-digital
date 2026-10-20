import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { leerSesionDePuerta, SESION_DE_PUERTA_MS, valorDeSesionDePuerta } from './porter-session'

const SECRETO = 'clave-del-servidor-de-pruebas'
const TOKEN = 'AbCdEfGhIjKlMnOpQrStUv'
const HASH = createHash('sha256').update(TOKEN).digest('hex')
const AHORA = Date.parse('2026-10-18T21:00:00Z')

const emitir = (over: Partial<Parameters<typeof valorDeSesionDePuerta>[0]> = {}) =>
  valorDeSesionDePuerta({ secreto: SECRETO, porterId: 'p1', tokenHashHex: HASH, issuedAt: AHORA, ...over })

describe('la sesión de puerta', () => {
  it('se lee y dice de qué portero y de qué enlace es', () => {
    expect(leerSesionDePuerta({ secreto: SECRETO, value: emitir(), now: AHORA + 60_000 })).toEqual({
      porterId: 'p1',
      tokenHashHex: HASH,
    })
  })

  it('el enlace del portero NO sirve de sesión: solo vale lo que firma el servidor tras el PIN', () => {
    // Era el fallo: la cookie era el propio token de la URL, así que quien tenía el enlace
    // entraba sin escribir nunca el PIN.
    expect(leerSesionDePuerta({ secreto: SECRETO, value: TOKEN, now: AHORA })).toBeNull()
    expect(leerSesionDePuerta({ secreto: SECRETO, value: `p1.${HASH}.${AHORA}`, now: AHORA })).toBeNull()
    expect(leerSesionDePuerta({ secreto: SECRETO, value: `p1.${HASH}.${AHORA}.firma-inventada`, now: AHORA })).toBeNull()
  })

  it('sin el secreto del servidor no se puede fabricar', () => {
    expect(leerSesionDePuerta({ secreto: 'otra-clave-del-servidor', value: emitir(), now: AHORA })).toBeNull()
  })

  it('cambiar el portero, el enlace o la marca rompe la firma', () => {
    const [, hash, marca, firma] = emitir().split('.')
    expect(leerSesionDePuerta({ secreto: SECRETO, value: `p9.${hash}.${marca}.${firma}`, now: AHORA })).toBeNull()
    expect(leerSesionDePuerta({ secreto: SECRETO, value: `p1.${'0'.repeat(64)}.${marca}.${firma}`, now: AHORA })).toBeNull()
    expect(leerSesionDePuerta({ secreto: SECRETO, value: `p1.${hash}.${AHORA + 1}.${firma}`, now: AHORA })).toBeNull()
  })

  it('caduca a las veinticuatro horas, y una marca futura no vale', () => {
    expect(leerSesionDePuerta({ secreto: SECRETO, value: emitir(), now: AHORA + SESION_DE_PUERTA_MS - 1 })).not.toBeNull()
    expect(leerSesionDePuerta({ secreto: SECRETO, value: emitir(), now: AHORA + SESION_DE_PUERTA_MS + 1 })).toBeNull()
    expect(leerSesionDePuerta({ secreto: SECRETO, value: emitir({ issuedAt: AHORA + 60_000 }), now: AHORA })).toBeNull()
  })
})

import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { isUnlockValid, unlockValue } from './unlock-token'

const HASH = '$argon2id$v=19$m=19456,t=2,p=1$abc$def'
const AHORA = 1_700_000_000_000
const DOCE_HORAS = 12 * 60 * 60 * 1000
const SECRETO = 'secreto-del-servidor-largo'

describe('unlockValue', () => {
  it('caduca de verdad: pasadas las horas, el mismo valor deja de valer', () => {
    // Antes el valor era constante para el evento y el `maxAge` lo controlaba el
    // navegador: quien copiara la cookie entraba para siempre.
    const valor = unlockValue({ eventId: 'e1', passwordHash: HASH, secreto: SECRETO, issuedAt: AHORA })

    expect(isUnlockValid({ value: valor, eventId: 'e1', passwordHash: HASH, secreto: SECRETO, now: AHORA + DOCE_HORAS - 1000 })).toBe(true)
    expect(isUnlockValid({ value: valor, eventId: 'e1', passwordHash: HASH, secreto: SECRETO, now: AHORA + DOCE_HORAS + 1000 })).toBe(false)
  })

  it('no vale para otro evento ni con otra contraseña', () => {
    const valor = unlockValue({ eventId: 'e1', passwordHash: HASH, secreto: SECRETO, issuedAt: AHORA })

    expect(isUnlockValid({ value: valor, eventId: 'e2', passwordHash: HASH, secreto: SECRETO, now: AHORA })).toBe(false)
    expect(isUnlockValid({ value: valor, eventId: 'e1', passwordHash: 'otro-hash', secreto: SECRETO, now: AHORA })).toBe(false)
  })

  it('una firma manipulada no abre nada', () => {
    const valor = unlockValue({ eventId: 'e1', passwordHash: HASH, secreto: SECRETO, issuedAt: AHORA })
    const [marca] = valor.split('.')
    const falsificada = `${marca}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`

    expect(isUnlockValid({ value: falsificada, eventId: 'e1', passwordHash: HASH, secreto: SECRETO, now: AHORA })).toBe(false)
  })

  it('una marca de tiempo adelantada a mano tampoco: va dentro de la firma', () => {
    const valor = unlockValue({ eventId: 'e1', passwordHash: HASH, secreto: SECRETO, issuedAt: AHORA })
    const [, firma] = valor.split('.')
    const estirada = `${AHORA + DOCE_HORAS}.${firma}`

    expect(isUnlockValid({ value: estirada, eventId: 'e1', passwordHash: HASH, secreto: SECRETO, now: AHORA + DOCE_HORAS })).toBe(false)
  })

  it('un valor con basura no revienta: simplemente no abre', () => {
    expect(isUnlockValid({ value: 'basura', eventId: 'e1', passwordHash: HASH, secreto: SECRETO, now: AHORA })).toBe(false)
    expect(isUnlockValid({ value: '', eventId: 'e1', passwordHash: HASH, secreto: SECRETO, now: AHORA })).toBe(false)
  })
})

/**
 * F18 del escaneo: la clave del HMAC **era** el hash guardado en la base, así que con un volcado
 * —un respaldo filtrado— se fabricaba la cookie de cualquier evento protegido y se bajaban sus
 * fotos y su música sin romper el argon2.
 */
describe('la firma del desbloqueo depende del secreto del servidor', () => {
  it('con otro secreto, el mismo hash no abre nada', () => {
    const valor = unlockValue({ eventId: 'e1', passwordHash: HASH, issuedAt: AHORA, secreto: SECRETO })

    expect(isUnlockValid({ value: valor, eventId: 'e1', passwordHash: HASH, now: AHORA, secreto: 'otro-secreto-del-servidor' })).toBe(false)
  })

  it('y conocer el hash ya no basta: la firma con el hash como clave no vale', () => {
    const comoAntes = createHmac('sha256', HASH).update(`e1.${AHORA}`).digest('base64url')

    expect(isUnlockValid({ value: `${AHORA}.${comoAntes}`, eventId: 'e1', passwordHash: HASH, now: AHORA, secreto: SECRETO })).toBe(false)
  })

  it('cambiar la contraseña sigue invalidando lo repartido', () => {
    const valor = unlockValue({ eventId: 'e1', passwordHash: HASH, issuedAt: AHORA, secreto: SECRETO })

    expect(isUnlockValid({ value: valor, eventId: 'e1', passwordHash: 'hash-nuevo', now: AHORA, secreto: SECRETO })).toBe(false)
  })
})

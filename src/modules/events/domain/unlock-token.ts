import { createHmac, timingSafeEqual } from 'node:crypto'

/** Doce horas: una tarde entera de fiesta cabe de sobra. */
export const UNLOCK_MS = 12 * 60 * 60 * 1000

/**
 * El valor de la cookie que abre un evento protegido: `emisión.firma`.
 *
 * La marca de tiempo va **dentro** de la firma, así que estirarla a mano invalida el
 * valor. Antes el valor era constante para el evento y la caducidad la ponía el
 * navegador con `maxAge`: quien copiara la cookie entraba indefinidamente.
 *
 * La clave del HMAC es el hash de la propia contraseña: cambiarla invalida por sí sola
 * todos los desbloqueos repartidos, sin inventar otro secreto que administrar.
 */
export function unlockValue(input: { eventId: string; passwordHash: string; issuedAt: number }): string {
  const firma = createHmac('sha256', input.passwordHash)
    .update(`${input.eventId}.${input.issuedAt}`)
    .digest('base64url')
  return `${input.issuedAt}.${firma}`
}

/** Comparación en tiempo constante: la desigualdad no debe medirse por lo que tarda. */
function iguales(a: string, b: string): boolean {
  const uno = Buffer.from(a)
  const otro = Buffer.from(b)
  return uno.length === otro.length && timingSafeEqual(uno, otro)
}

export function isUnlockValid(input: {
  value: string
  eventId: string
  passwordHash: string
  now: number
}): boolean {
  const [marca, firma] = input.value.split('.')
  if (marca === undefined || firma === undefined) return false

  const issuedAt = Number(marca)
  if (!Number.isFinite(issuedAt)) return false
  if (input.now - issuedAt > UNLOCK_MS || issuedAt > input.now) return false

  return iguales(input.value, unlockValue({ eventId: input.eventId, passwordHash: input.passwordHash, issuedAt }))
}

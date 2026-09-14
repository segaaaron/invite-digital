import { randomInt } from 'node:crypto'

/**
 * El código de un solo uso para recuperar la contraseña.
 *
 * Puro y sin reloj: la hora entra como argumento, igual que en los recordatorios y en el
 * auto-asignado de mesas. Así la caducidad se prueba sin tocar el reloj del sistema.
 */

/** Seis dígitos: se dicta por teléfono y se teclea en un móvil con prisa. */
export const OTP_LENGTH = 6

/**
 * Diez minutos. Suficiente para ir al correo y volver, y corto para que un código que se
 * queda en una bandeja ajena no valga por la tarde.
 */
export const OTP_TTL_MS = 10 * 60 * 1000

/**
 * Cinco intentos.
 *
 * Seis dígitos son un millón de combinaciones: sin contar los intentos, un guion las
 * prueba todas. Con cinco, la probabilidad de acertar a ciegas es de una entre doscientas
 * mil por código emitido.
 */
export const MAX_OTP_ATTEMPTS = 5

/**
 * Un código nuevo, con ceros a la izquierda incluidos.
 *
 * `randomInt` de `node:crypto` y no `Math.random`: esto protege una cuenta, y el
 * generador de números pseudoaleatorios del motor es predecible desde dentro del proceso.
 */
export function newOtp(): string {
  let codigo = ''
  for (let i = 0; i < OTP_LENGTH; i += 1) codigo += String(randomInt(10))
  return codigo
}

/** Lo que teclea un humano: espacios de sobra, guiones al copiar del correo. */
export function normalizeOtp(raw: string): string | null {
  const limpio = raw.replace(/[\s-]/g, '')
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(limpio) ? limpio : null
}

export function otpExpiry(now: Date): Date {
  return new Date(now.getTime() + OTP_TTL_MS)
}

export type ResetRow = {
  readonly expiresAt: Date
  readonly consumedAt: Date | null
  readonly attempts: number
}

/**
 * Si este código todavía admite un intento.
 *
 * Las tres condiciones por separado y no un booleano guardado: un código gastado, uno
 * caducado y uno agotado son estados distintos en la base, y derivarlos es lo que impide
 * que se desincronicen.
 */
export function canAttemptReset(reset: ResetRow, now: Date): boolean {
  if (reset.consumedAt !== null) return false
  if (reset.expiresAt.getTime() <= now.getTime()) return false
  return reset.attempts < MAX_OTP_ATTEMPTS
}

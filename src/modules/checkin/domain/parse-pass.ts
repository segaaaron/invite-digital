import { err, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from './errors'

/** 16 bytes en base64url: veintidós caracteres de `[A-Za-z0-9_-]`. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{22}$/
const INVITATION_PATH = /\/i\/([A-Za-z0-9_-]{22})\/?$/

/**
 * Lo escaneado puede ser la URL completa del QR o el token pelado que teclea un lector
 * por USB. La forma se valida aquí, antes de tocar la base: un QR de un cartel de la
 * calle no debe llegar a consultar Postgres.
 */
export function parsePass(scanned: string): Result<string, CheckinError> {
  const raw = scanned.trim()
  if (raw.length === 0) return err(checkinError('malformed_pass', 'Escaneo vacío'))

  if (TOKEN_SHAPE.test(raw)) return ok(raw)

  if (raw.includes('://')) {
    let path: string
    try {
      path = new URL(raw).pathname
    } catch {
      return err(checkinError('malformed_pass', 'No es una dirección válida'))
    }
    const found = INVITATION_PATH.exec(path)
    if (found?.[1]) return ok(found[1])
  }

  return err(checkinError('malformed_pass', 'El código no tiene forma de pase'))
}

import { err, isErr, ok, type Result } from '@/shared/result'
import { qrError, type QrError } from './errors'

/**
 * Para qué es cada código. El tipo no cambia el comportamiento —todos redirigen— pero
 * agrupa la lista y deja poner el rótulo correcto sin que el atelier lo escriba.
 */
export const QR_KINDS = ['registry', 'store', 'custom'] as const
export type QrKind = (typeof QR_KINDS)[number]

export type QrCode = {
  readonly id: string
  readonly label: string
  readonly kind: QrKind
  /** Ruta interna que empieza por `/`, o una URL `http`/`https`. */
  readonly target: string
  readonly active: boolean
}

const MAX_LABEL = 120

/**
 * El destino de un código.
 *
 * **Solo `http`, `https` o una ruta interna.** Ese valor acaba siendo la cabecera
 * `Location` de una redirección que pulsa un invitado: un `javascript:` ahí sería un
 * agujero abierto por el propio panel. Es la misma regla que ya rige la URL de tienda de
 * la mesa de regalos.
 */
function checkTarget(raw: string): Result<string, QrError> {
  const target = raw.trim()
  if (target === '') return err(qrError('invalid_target', 'El código necesita un destino.'))

  if (target.startsWith('/')) {
    // `//otro-dominio` empieza por barra y **no** es interno: el navegador lo lee como
    // protocolo relativo y se va del sitio. La comprobación ingenua lo dejaba pasar.
    if (target.startsWith('//')) return err(qrError('invalid_target', 'Esa dirección sale del sitio.'))
    return ok(target)
  }

  try {
    const url = new URL(target)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return err(qrError('invalid_target', 'Solo admitimos direcciones http o https.'))
    }
    return ok(target)
  } catch {
    return err(qrError('invalid_target', 'Eso no es una dirección válida ni una ruta que empiece por «/».'))
  }
}

export function createQrCode(input: {
  id: string
  label: string
  kind: QrKind
  target: string
  active: boolean
}): Result<QrCode, QrError> {
  const label = input.label.trim()
  if (label === '' || label.length > MAX_LABEL) {
    return err(qrError('invalid_label', `La etiqueta va de 1 a ${MAX_LABEL} caracteres.`))
  }

  if (!(QR_KINDS as readonly string[]).includes(input.kind)) {
    return err(qrError('invalid_kind', `Tipo de código desconocido: ${input.kind}`))
  }

  const target = checkTarget(input.target)
  if (isErr(target)) return target

  return ok({ id: input.id, label, kind: input.kind, target: target.value, active: input.active })
}

/**
 * La dirección que va **dentro** del código.
 *
 * Apunta a nosotros, no al destino, y ahí está todo el punto del motor: un QR impreso con
 * la dirección final dentro queda muerto el día que esa tienda cambia el enlace, y ya está
 * colgado en el salón. Con este, se cambia la fila.
 */
export function qrUrl(id: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/r/${id}`
}

/** Los destinos internos que el atelier no debería tener que escribir a mano. */
export const internalTarget = {
  registry: (token: string): string => `/i/${token}#regalos`,
} as const

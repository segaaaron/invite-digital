/**
 * El comprobante de pago, tratado como entrada hostil desde el primer byte.
 *
 * Ni la extensión del nombre ni el `Content-Type` de la petición sirven para decidir qué
 * es un fichero: **las dos las escribe quien lo sube**. Lo único que no puede falsificar
 * sin dejar de ser el fichero que dice ser son sus primeros bytes.
 */

/** Ocho megas. Una foto de un comprobante desde un celular no llega a dos. */
export const MAX_PROOF_BYTES = 8 * 1024 * 1024

export const ACCEPTED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export type ProofMime = (typeof ACCEPTED_MIMES)[number]

const empieza = (bytes: Uint8Array, firma: readonly number[]): boolean =>
  bytes.length >= firma.length && firma.every((byte, i) => bytes[i] === byte)

/** Los bytes de una cadena ASCII, para comparar cabeceras de texto como `%PDF` o `RIFF`. */
const ascii = (texto: string): number[] => [...texto].map((c) => c.charCodeAt(0))

export function sniffMime(bytes: Uint8Array): ProofMime | null {
  if (empieza(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (empieza(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (empieza(bytes, ascii('%PDF-'))) return 'application/pdf'

  // WEBP es un contenedor RIFF: los cuatro primeros bytes los comparte con WAV y AVI, y
  // el tipo real está en el byte 8. Mirar solo «RIFF» aceptaría un audio como imagen.
  if (empieza(bytes, ascii('RIFF')) && bytes.length >= 12) {
    const marca = String.fromCharCode(...bytes.slice(8, 12))
    if (marca === 'WEBP') return 'image/webp'
  }

  return null
}

export type ProofVerdict =
  | { ok: true; mime: ProofMime }
  | { ok: false; reason: 'vacio' | 'demasiado_grande' | 'tipo_no_admitido' }

export function checkProof(input: {
  bytes: Uint8Array
  /** Solo para enseñarlo. **Nunca** se usa para construir una ruta de disco. */
  declaredName: string
  /** Lo que dice el navegador. Se ignora a propósito para decidir el tipo. */
  declaredType: string
}): ProofVerdict {
  if (input.bytes.length === 0) return { ok: false, reason: 'vacio' }
  if (input.bytes.length > MAX_PROOF_BYTES) return { ok: false, reason: 'demasiado_grande' }

  const mime = sniffMime(input.bytes)
  return mime === null ? { ok: false, reason: 'tipo_no_admitido' } : { ok: true, mime }
}

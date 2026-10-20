import { createHmac, timingSafeEqual } from 'node:crypto'

/** Un día: la ventana del evento la corta el servidor en cada petición, no esto. */
export const SESION_DE_PUERTA_MS = 24 * 60 * 60 * 1000

/**
 * El valor de la cookie que prueba que el portero escribió su PIN: `portero.enlace.emisión.firma`.
 *
 * Antes la cookie era **el token del enlace**, que es justo lo que el portero recibe por
 * WhatsApp: quien tuviera el enlace se la ponía a mano y entraba sin PIN a la lista de
 * invitados y a registrar, corregir o anular ingresos. El PIN no protegía nada.
 *
 * Esto solo lo puede emitir el servidor, porque la firma lleva un secreto suyo. Va atado al
 * portero y a su enlace —por su hash, nunca el token— así que quitarlo o reemitir el enlace
 * invalida la sesión, y la marca de tiempo viaja **dentro** de la firma: estirarla a mano
 * rompe el valor.
 */
export function valorDeSesionDePuerta(input: { secreto: string; porterId: string; tokenHashHex: string; issuedAt: number }): string {
  const cuerpo = `${input.porterId}.${input.tokenHashHex}.${input.issuedAt}`
  const firma = createHmac('sha256', `luxury-atelier:puerta:${input.secreto}`).update(cuerpo).digest('base64url')
  return `${cuerpo}.${firma}`
}

/** Comparación en tiempo constante: la desigualdad no debe medirse por lo que tarda. */
function iguales(a: string, b: string): boolean {
  const uno = Buffer.from(a)
  const otro = Buffer.from(b)
  return uno.length === otro.length && timingSafeEqual(uno, otro)
}

/** De qué portero y de qué enlace es esta sesión, o `null` si no la firmó el servidor o ya caducó. */
export function leerSesionDePuerta(input: { secreto: string; value: string; now: number }): { porterId: string; tokenHashHex: string } | null {
  const [porterId, tokenHashHex, marca, firma] = input.value.split('.')
  if (porterId === undefined || tokenHashHex === undefined || marca === undefined || firma === undefined) return null

  const issuedAt = Number(marca)
  if (!Number.isFinite(issuedAt)) return null
  if (issuedAt > input.now || input.now - issuedAt > SESION_DE_PUERTA_MS) return null

  if (!iguales(input.value, valorDeSesionDePuerta({ secreto: input.secreto, porterId, tokenHashHex, issuedAt }))) return null
  return { porterId, tokenHashHex }
}

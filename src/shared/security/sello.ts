import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Cifra y descifra con AES-256-GCM. Para lo que el panel tiene que **volver a enseñar** sin
 * dejarlo en claro en la base: el enlace de cada invitado. Un volcado de la base sin la clave
 * no produce enlaces; la búsqueda por enlace sigue yendo por su SHA-256.
 *
 * La clave sale de `LINK_KEY` y, sin ella, de `DATABASE_URL`, que tampoco vive en la base.
 * ponytail: cambiar cualquiera de las dos deja sin poder enseñar los enlaces ya guardados
 * (siguen abriendo); el panel ofrece entonces generar uno nuevo.
 */
export function crearSello(secreto: string) {
  const clave = createHash('sha256').update(`luxury-atelier:enlaces:${secreto}`).digest()
  return {
    sellar(texto: string): string {
      const iv = randomBytes(12)
      const cifrador = createCipheriv('aes-256-gcm', clave, iv)
      const cuerpo = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()])
      return Buffer.concat([iv, cifrador.getAuthTag(), cuerpo]).toString('base64url')
    },
    /** `null` si no se puede abrir: otra clave, o el dato tocado. */
    abrir(sellado: string): string | null {
      try {
        const datos = Buffer.from(sellado, 'base64url')
        const descifrador = createDecipheriv('aes-256-gcm', clave, datos.subarray(0, 12))
        descifrador.setAuthTag(datos.subarray(12, 28))
        return Buffer.concat([descifrador.update(datos.subarray(28)), descifrador.final()]).toString('utf8')
      } catch {
        return null
      }
    },
  }
}

import { createHash, randomBytes } from 'node:crypto'

export type MintedToken = { readonly token: string; readonly hash: Buffer }

export interface Minter {
  mint(): MintedToken
  hashOf(token: string): Buffer
}

const TOKEN_BYTES = 16 // 128 bits, como fija la sección 7 del spec

/**
 * El token en claro existe una sola vez: cuando se acuña y se entrega. En la base solo
 * queda su SHA-256, así que un volcado robado no produce enlaces utilizables. SHA-256
 * sin sal basta porque el token ya es aleatorio uniforme de 128 bits: no hay diccionario
 * que precalcular.
 */
export function createTokenMinter(): Minter {
  const hashOf = (token: string): Buffer => createHash('sha256').update(token).digest()

  return {
    hashOf,
    mint() {
      const token = randomBytes(TOKEN_BYTES).toString('base64url')
      return { token, hash: hashOf(token) }
    },
  }
}

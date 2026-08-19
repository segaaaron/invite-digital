import { hash, verify } from '@node-rs/argon2'
import type { PasswordHasher } from '../application/ports'

// Parámetros de la recomendación OWASP para Argon2id: 19 MiB, 2 pasadas, 1 hilo.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const

export const argon2Hasher: PasswordHasher = {
  hash: (password) => hash(password, OPTIONS),
  // Un hash con formato inválido hace que `verify` lance; aquí eso es "no coincide", no
  // una caída: el hash señuelo de `signIn` pasa por este mismo camino.
  verify: async (password, digest) => {
    try {
      return await verify(digest, password, OPTIONS)
    } catch {
      return false
    }
  },
}

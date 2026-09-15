import { randomBytes } from 'node:crypto'
import { changePassword } from '@/modules/identity/application/change-password'
import { confirmPasswordReset, requestPasswordReset } from '@/modules/identity/application/password-reset-use-cases'
import { drizzlePasswordResetRepository } from '@/modules/identity/infrastructure/drizzle-password-reset-repository'
import { authenticateSession } from '@/modules/identity/application/authenticate-session'
import { signIn } from '@/modules/identity/application/sign-in'
import { signOut } from '@/modules/identity/application/sign-out'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { drizzleSessionRepository } from '@/modules/identity/infrastructure/drizzle-session-repository'
import { drizzleSupportStore } from '@/modules/identity/infrastructure/drizzle-support-store'
import { drizzleUserRepository, setProvisionalPassword } from '@/modules/identity/infrastructure/drizzle-user-repository'
import { resetClientAccess } from '@/modules/identity/application/reset-client-access'
import { clock, minter } from './base'

export const identity = {
  signIn: signIn({ users: drizzleUserRepository, sessions: drizzleSessionRepository, hasher: argon2Hasher, minter, clock }),
  signOut: signOut({ sessions: drizzleSessionRepository, minter }),
  authenticateSession: authenticateSession({ sessions: drizzleSessionRepository, minter, clock }),
  /** Quién es y qué puede quien tiene esta sesión. Lo consume `requireSession()`. */
  actorOf: (userId: string) => drizzleUserRepository.findActor(userId),
  /** El modo soporte: el admin actúa como el cliente, sin su contraseña. */
  support: drizzleSupportStore,
  /** El cliente no puede entrar: provisional nueva, sesiones cerradas. Solo sobre clientes. */
  resetClientAccess: resetClientAccess({
    findActor: (id) => drizzleUserRepository.findActor(id),
    setProvisionalPassword,
    closeSessions: (id) => drizzleSessionRepository.deleteByUser(id),
    hash: (clave) => argon2Hasher.hash(clave),
    generate: () => randomBytes(12).toString('base64url'),
  }),
  /**
   * Cambiar la propia contraseña. Las cuentas las da de alta otro y la clave inicial viaja
   * por WhatsApp: sin esto, la que escribió otra persona vale para siempre.
   */
  changePassword: changePassword({
    users: drizzleUserRepository,
    sessions: drizzleSessionRepository,
    hasher: argon2Hasher,
  }),
  /**
   * La recuperación por código.
   *
   * `request` devuelve el código en claro **una sola vez**, para que la acción lo mande
   * por correo: en la base solo queda su SHA-256, igual que los tokens de sesión.
   */
  requestPasswordReset: requestPasswordReset({
    users: drizzleUserRepository,
    resets: drizzlePasswordResetRepository,
    minter,
    clock,
  }),
  confirmPasswordReset: confirmPasswordReset({
    users: drizzleUserRepository,
    resets: drizzlePasswordResetRepository,
    sessions: drizzleSessionRepository,
    hasher: argon2Hasher,
    minter,
    clock,
  }),
} as const

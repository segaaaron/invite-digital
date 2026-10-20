import { randomBytes } from 'node:crypto'
import { changePassword } from '@/modules/identity/application/change-password'
import { changeEmail, closeOtherSessions, confirmPasswordReset, requestAccountCode, requestEmailChange, requestPasswordReset } from '@/modules/identity/application/password-reset-use-cases'
import { drizzlePasswordResetRepository } from '@/modules/identity/infrastructure/drizzle-password-reset-repository'
import { authenticateSession } from '@/modules/identity/application/authenticate-session'
import { signIn } from '@/modules/identity/application/sign-in'
import { signOut } from '@/modules/identity/application/sign-out'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { borrarSesionesDelDispositivo, drizzleSessionRepository } from '@/modules/identity/infrastructure/drizzle-session-repository'
import { DISPOSITIVO_DE_SIRI } from '@/modules/identity/domain/dispositivo'
import { nextExpiry } from '@/modules/identity/domain/session'
import { drizzleSupportStore } from '@/modules/identity/infrastructure/drizzle-support-store'
import { drizzleUserRepository, setProvisionalPassword } from '@/modules/identity/infrastructure/drizzle-user-repository'
import { resetClientAccess } from '@/modules/identity/application/reset-client-access'
import { eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { passwordResets, users } from '@/shared/db/schema'
import { clock, minter } from './base'
import { isLocale, type Locale } from '@/shared/i18n/locales'

/** Leer y escribir el correo de una cuenta: lo que necesitan los dos pasos del cambio de correo. */
const correosDeLaCuenta = {
  findIdByEmail: (email: string) => drizzleUserRepository.findIdByEmail(email),
  updateEmail: async (userId: string, email: string) => {
    await db.update(users).set({ email }).where(eq(users.id, userId))
  },
}

export const identity = {
  signIn: signIn({ users: drizzleUserRepository, sessions: drizzleSessionRepository, hasher: argon2Hasher, minter, clock }),
  signOut: signOut({ sessions: drizzleSessionRepository, minter }),
  authenticateSession: authenticateSession({ sessions: drizzleSessionRepository, minter, clock }),
  /** Quién es y qué puede quien tiene esta sesión. Lo consume `requireSession()`. */
  actorOf: (userId: string) => drizzleUserRepository.findActor(userId),
  /** El nombre con que firma la tarjeta de la barra; sin él, la carcasa usa el correo. Nunca lanza. */
  nombreDe: async (userId: string): Promise<string | null> =>
    db
      .select({ nombre: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .then((filas) => filas[0]?.nombre ?? null)
      .catch(() => null),
  /** Nombre y teléfono de la propia cuenta, para «Tus datos» en Mi cuenta. */
  misDatos: async (userId: string): Promise<{ nombre: string | null; telefono: string | null }> =>
    db
      .select({ nombre: users.fullName, telefono: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .then((filas) => filas[0] ?? { nombre: null, telefono: null }),
  /** Los guarda tal cual vienen ya limpios: vacío es borrar. El correo no se toca aquí. */
  guardarMisDatos: async (userId: string, datos: { nombre: string | null; telefono: string | null }): Promise<void> => {
    await db.update(users).set({ fullName: datos.nombre, phone: datos.telefono }).where(eq(users.id, userId))
  },
  /**
   * El correo nuevo que está esperando su código (`0098`), si lo hay y todavía vale.
   *
   * Recargar «Mi cuenta» borraba el paso dos del cambio de correo: la dirección y el «ya te lo
   * mandamos» vivían solo en React, y el código seguía siendo válido diez minutos sin ninguna
   * pantalla donde escribirlo. Al venir de la base, la pantalla vuelve sola donde estaba.
   * Nunca lanza: sin esto la página entera caería por un dato de adorno.
   */
  correoPendiente: async (userId: string): Promise<string | null> =>
    db
      .select({ email: passwordResets.pendingEmail, expira: passwordResets.expiresAt, gastado: passwordResets.consumedAt })
      .from(passwordResets)
      .where(eq(passwordResets.userId, userId))
      .then((filas) => {
        const fila = filas[0]
        if (fila === undefined || fila.email === null || fila.gastado !== null) return null
        return fila.expira.getTime() > Date.now() ? fila.email : null
      })
      .catch(() => null),
  /** El idioma del último aparato con que entró (`0094`): el de sus correos. Nulo si no ha entrado desde el 14 oct. Nunca lanza. */
  idiomaDe: async (userId: string): Promise<Locale | null> =>
    db
      .select({ locale: users.locale })
      .from(users)
      .where(eq(users.id, userId))
      .then((filas) => {
        const valor = filas[0]?.locale ?? null
        return valor !== null && isLocale(valor) ? valor : null
      })
      .catch(() => null),
  guardarIdioma: async (userId: string, locale: Locale): Promise<void> => {
    await db.update(users).set({ locale }).where(eq(users.id, userId))
  },
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
  /** Las sesiones abiertas de la cuenta, para Mi cuenta. */
  sessionsOf: (userId: string) => drizzleSessionRepository.listByUser(userId),
  nombrarSesion: (sessionId: string, device: string) => drizzleSessionRepository.setDevice(sessionId, device),
  /** Un código al correo de quien tiene la sesión: para cambiar la contraseña o cerrar las demás. */
  requestAccountCode: requestAccountCode({ users: drizzleUserRepository, resets: drizzlePasswordResetRepository, minter, clock }),
  /**
   * **La llave del Atajo de Siri**: una sesión propia («Atajo de Siri») de quien la pide; la anterior deja de
   * valer. Se devuelve en claro una sola vez (en la base, su SHA-256, como toda sesión).
   */
  llaveDeSiri: async (userId: string): Promise<string> => {
    await borrarSesionesDelDispositivo(userId, DISPOSITIVO_DE_SIRI)
    const { token, hash } = minter.mint()
    await drizzleSessionRepository.create({ userId, tokenHash: hash, expiresAt: nextExpiry(clock()), device: DISPOSITIVO_DE_SIRI })
    return token
  },
  closeOtherSessions: closeOtherSessions({ resets: drizzlePasswordResetRepository, sessions: drizzleSessionRepository, minter, clock }),
  /**
   * El cambio de correo, en dos pasos (`0098`): el código se emite **para** la dirección nueva y
   * viaja a ella, así que aplicarlo prueba que esa dirección es tuya. Antes bastaba el código del
   * correo actual, y con eso una cuenta podía ponerse el correo de alguien que estaba por comprar
   * y heredar su acceso cuando el admin lo diera de alta (F12).
   */
  pedirCodigoDeCorreoNuevo: requestEmailChange({ resets: drizzlePasswordResetRepository, minter, clock, emails: correosDeLaCuenta }),
  cambiarCorreo: changeEmail({ resets: drizzlePasswordResetRepository, minter, clock, emails: correosDeLaCuenta }),
} as const

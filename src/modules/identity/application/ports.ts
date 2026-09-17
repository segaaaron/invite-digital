export interface UserRepository {
  findByEmail(email: string): Promise<{ id: string; email: string; passwordHash: string } | null>
  /**
   * El actor de una sesión: quién es y qué puede. Lo pide `requireSession()` en cada
   * página del panel, y por eso devuelve el rol en la misma consulta: resolverlo aparte
   * sería un viaje más por página para un dato de dieciséis caracteres.
   */
  findActor(userId: string): Promise<{ id: string; email: string; role: string; mustChangePassword: boolean } | null>
  create(user: { email: string; passwordHash: string; role?: string }): Promise<{ id: string }>
  /** Rellena nombre y teléfono **solo si faltan**: lo que la persona ya tenía no se pisa. */
  completarContacto(userId: string, contacto: { fullName: string | null; phone: string | null }): Promise<void>
  /**
   * Sustituye el hash y **apaga la marca de provisional**: quien acaba de elegir su
   * contraseña ya no tiene una que escribió otro. Van juntos a propósito — dejarlo en dos
   * llamadas es dejar la puerta a cambiarla y seguir con la marca puesta, o al revés.
   */
  updatePassword(userId: string, passwordHash: string): Promise<void>
  /** Por correo, para la recuperación: quien la pide escribe su correo, no su id. */
  findIdByEmail(email: string): Promise<string | null>
}

/**
 * Los códigos de un solo uso para recuperar la contraseña.
 *
 * Va en su propio puerto y no dentro de `UserRepository` porque es otra tabla con su
 * propio ciclo de vida: nace al pedir el código, se gasta al usarlo y la caduca el reloj.
 */
export interface PasswordResetRepository {
  /** Invalida los anteriores del usuario y guarda el nuevo. Del código solo el SHA-256. */
  issue(input: { userId: string; codeHash: Buffer; expiresAt: Date }): Promise<void>
  /** El último código vivo de ese usuario, con lo que hace falta para juzgarlo. */
  findLive(userId: string): Promise<{ id: string; codeHash: Buffer; expiresAt: Date; consumedAt: Date | null; attempts: number } | null>
  /** Un intento fallido más. Es lo que corta la fuerza bruta sobre seis dígitos. */
  countAttempt(id: string): Promise<void>
  /** Lo gasta: un código vale una vez. */
  consume(id: string, at: Date): Promise<void>
  /** Barrido de los caducados, como el de sesiones. */
  deleteExpired(now: Date): Promise<number>
}

export interface SessionRepository {
  create(session: { userId: string; tokenHash: Buffer; expiresAt: Date; device?: string | null }): Promise<void>
  /** `supportSessionId`: el modo soporte abierto de esta sesión, si lo hay (`0049`). */
  findByTokenHash(tokenHash: Buffer): Promise<{ id: string; userId: string; expiresAt: Date; supportSessionId?: string | null; lastSeenAt?: Date | null; device?: string | null } | null>
  /** Cuándo se usó por última vez. Se escribe como mucho cada pocos minutos, no en cada petición. */
  seen(id: string, at: Date): Promise<void>
  /** Pone el dispositivo a una sesión que no lo tenía: las abiertas antes de guardarlo. */
  setDevice(id: string, device: string): Promise<void>
  /** Las abiertas de un usuario, la más usada primero. */
  listByUser(userId: string): Promise<Array<{ id: string; device: string | null; createdAt: Date; lastSeenAt: Date | null }>>
  /** Todas menos `keepId`. */
  deleteOthers(userId: string, keepId: string): Promise<void>
  touch(id: string, expiresAt: Date): Promise<void>
  deleteByTokenHash(tokenHash: Buffer): Promise<void>
  deleteExpired(now: Date): Promise<number>
  /** Todas las de un usuario. Lo usa el cambio de contraseña: cambiarla echa a todo el mundo. */
  deleteByUser(userId: string): Promise<void>
}

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, hash: string): Promise<boolean>
}

export interface TokenMinter {
  mint(): { token: string; hash: Buffer }
  hashOf(token: string): Buffer
}

/**
 * El modo soporte: el admin actúa como el cliente sin conocer su contraseña.
 *
 * Vive en la sesión del admin, no en una cookie aparte: cerrar sesión lo cierra, y quien no
 * tiene la sesión del admin no puede abrirlo ni cerrarlo.
 */
export interface SupportStore {
  /** Abre uno en esa sesión y cierra el que hubiera abierto. Devuelve su id. */
  open(input: { sessionId: string; adminUserId: string; adminEmail: string; clientUserId: string; eventId: string; reason: string }): Promise<string>
  /** El abierto de esa sesión, o `null`. */
  activeFor(sessionId: string): Promise<{ id: string; adminEmail: string; clientUserId: string; eventId: string } | null>
  /** Cierra el abierto y la sesión deja de apuntar. `false` si no había ninguno. */
  close(sessionId: string, at: Date): Promise<boolean>
}

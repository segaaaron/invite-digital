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
  /**
   * Emite el código de esa cuenta: invalida el anterior y guarda el nuevo (del código, solo el
   * SHA-256). Una fila por cuenta, para que los contadores de la ventana **no** mueran con el
   * código viejo. `'demasiados'` si la cuenta ya gastó su cupo de códigos de la hora.
   */
  issue(input: { userId: string; codeHash: Buffer; expiresAt: Date; now: Date; pendingEmail?: string | null }): Promise<'emitido' | 'demasiados'>
  /**
   * Cobra un intento y devuelve el código vivo **en la misma sentencia**: cuenta primero y
   * compara después, así dos intentos a la vez no se cuelan por el hueco entre leer y sumar.
   */
  cobrarIntento(userId: string, now: Date): Promise<IntentoDeCodigo>
  /** Lo gasta: un código vale una vez. */
  consume(id: string, at: Date): Promise<void>
  /** Barrido de los caducados, como el de sesiones. */
  deleteExpired(now: Date): Promise<number>
}

/**
 * Lo que sale de cobrar un intento.
 *
 * **`sin_intentos` no es lo mismo que `sin_codigo`, y antes sí lo era**: los dos volvían como
 * `null`, las tres pantallas decían «pide uno nuevo» y con el cupo de fallos de la cuenta agotado
 * (quince en una hora, `0097`) pedir otro código no arregla nada —el contador sobrevive a emitir—,
 * así que la cuenta se quedaba hasta una hora sin poder recuperar la contraseña, cerrar sesiones ni
 * cambiar el correo, leyendo el único consejo que no sirve. `hasta` es cuándo se abre, para decirlo.
 */
export type IntentoDeCodigo =
  | { readonly estado: 'cobrado'; readonly id: string; readonly codeHash: Buffer; readonly pendingEmail: string | null }
  | { readonly estado: 'sin_intentos'; readonly hasta: Date }
  | { readonly estado: 'sin_codigo' }

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
  /** `clientUserId` nulo: el evento no tiene cliente y el admin entra como su anfitrión. */
  open(input: { sessionId: string; adminUserId: string; adminEmail: string; clientUserId: string | null; eventId: string; reason: string }): Promise<string>
  /** El abierto de esa sesión, o `null`. */
  activeFor(sessionId: string): Promise<{ id: string; adminEmail: string; clientUserId: string | null; eventId: string } | null>
  /** Cierra el abierto y la sesión deja de apuntar. `false` si no había ninguno. */
  close(sessionId: string, at: Date): Promise<boolean>
}

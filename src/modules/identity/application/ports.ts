export interface UserRepository {
  findByEmail(email: string): Promise<{ id: string; email: string; passwordHash: string } | null>
  /**
   * El actor de una sesión: quién es y qué puede. Lo pide `requireSession()` en cada
   * página del panel, y por eso devuelve el rol en la misma consulta: resolverlo aparte
   * sería un viaje más por página para un dato de dieciséis caracteres.
   */
  findActor(userId: string): Promise<{ id: string; email: string; role: string } | null>
  create(user: { email: string; passwordHash: string; role?: string }): Promise<{ id: string }>
}

export interface SessionRepository {
  create(session: { userId: string; tokenHash: Buffer; expiresAt: Date }): Promise<void>
  findByTokenHash(tokenHash: Buffer): Promise<{ id: string; userId: string; expiresAt: Date } | null>
  touch(id: string, expiresAt: Date): Promise<void>
  deleteByTokenHash(tokenHash: Buffer): Promise<void>
  deleteExpired(now: Date): Promise<number>
}

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, hash: string): Promise<boolean>
}

export interface TokenMinter {
  mint(): { token: string; hash: Buffer }
  hashOf(token: string): Buffer
}

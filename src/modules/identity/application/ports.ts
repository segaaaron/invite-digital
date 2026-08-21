export interface UserRepository {
  findByEmail(email: string): Promise<{ id: string; email: string; passwordHash: string } | null>
  create(user: { email: string; passwordHash: string }): Promise<{ id: string }>
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

import { describe, expect, it, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { signIn } from './sign-in'
import type { PasswordHasher, SessionRepository, TokenMinter, UserRepository } from './ports'

const HASH = '$argon2id$v=19$fake'

const users = (row: { id: string; email: string; passwordHash: string } | null): UserRepository => ({
  findByEmail: async () => row,
  findActor: async () =>
    row === null ? null : { id: row.id, email: row.email, role: 'atelier', mustChangePassword: false },
  create: async () => ({ id: 'nuevo' }),
  updatePassword: async () => {},
  findIdByEmail: async () => row?.id ?? null,
  completarContacto: async () => {},
})

const sessions = () => {
  const created: Array<{ userId: string }> = []
  const repo: SessionRepository = {
    create: async (session) => void created.push(session),
    findByTokenHash: async () => null,
    touch: async () => {},
    deleteByTokenHash: async () => {},
    deleteExpired: async () => 0,
    deleteByUser: async () => {},
    seen: async () => {},
    listByUser: async () => [],
    deleteOthers: async () => {},
  }
  return { repo, created }
}

const hasher = (matches: boolean): PasswordHasher => ({ hash: async () => HASH, verify: async () => matches })

const minter: TokenMinter = {
  mint: () => ({ token: 'token-en-claro', hash: Buffer.alloc(32, 1) }),
  hashOf: () => Buffer.alloc(32, 1),
}

const clock = () => new Date('2026-08-19T12:00:00Z')

describe('signIn', () => {
  it('crea la sesión y devuelve el token en claro una sola vez', async () => {
    const store = sessions()
    const result = await signIn({
      users: users({ id: 'u1', email: 'a@b.bo', passwordHash: HASH }),
      sessions: store.repo,
      hasher: hasher(true),
      minter,
      clock,
    })({ email: 'A@B.bo', password: 'contrasena-larga-1' })

    expect(isOk(result) && result.value.token).toBe('token-en-claro')
    expect(store.created).toHaveLength(1)
  })

  it('devuelve invalid_credentials cuando el correo no existe', async () => {
    const result = await signIn({ users: users(null), sessions: sessions().repo, hasher: hasher(true), minter, clock })({
      email: 'a@b.bo',
      password: 'contrasena-larga-1',
    })
    expect(isErr(result) && result.error.kind).toBe('invalid_credentials')
  })

  it('verifica el hash aunque el usuario no exista, para no filtrar por tiempo', async () => {
    const verify = vi.fn(async () => false)
    await signIn({ users: users(null), sessions: sessions().repo, hasher: { hash: async () => HASH, verify }, minter, clock })({
      email: 'a@b.bo',
      password: 'contrasena-larga-1',
    })
    expect(verify).toHaveBeenCalledTimes(1)
  })

  it('devuelve invalid_credentials, no weak_password, con una contraseña corta', async () => {
    const result = await signIn({
      users: users({ id: 'u1', email: 'a@b.bo', passwordHash: HASH }),
      sessions: sessions().repo,
      hasher: hasher(true),
      minter,
      clock,
    })({ email: 'a@b.bo', password: 'corta' })
    expect(isErr(result) && result.error.kind).toBe('invalid_credentials')
  })

  it('no crea sesión cuando la contraseña no coincide', async () => {
    const store = sessions()
    await signIn({
      users: users({ id: 'u1', email: 'a@b.bo', passwordHash: HASH }),
      sessions: store.repo,
      hasher: hasher(false),
      minter,
      clock,
    })({ email: 'a@b.bo', password: 'contrasena-larga-1' })
    expect(store.created).toHaveLength(0)
  })
})

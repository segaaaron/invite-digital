import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { createTokenMinter } from '@/shared/security/tokens'
import { createDrizzleSessionRepository } from './drizzle-session-repository'
import { createDrizzleUserRepository } from './drizzle-user-repository'

class RollbackForTest extends Error {}

async function inRolledBackTransaction(run: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await run(tx)
      throw new RollbackForTest()
    })
  } catch (error) {
    if (!(error instanceof RollbackForTest)) throw error
  }
}

describe('repositorios de identidad', () => {
  it('encuentra el usuario ignorando mayúsculas gracias a citext', async () => {
    await inRolledBackTransaction(async (tx) => {
      const users = createDrizzleUserRepository(tx)
      await users.create({ email: 'Atelier@Invite.bo', passwordHash: 'hash' })
      expect(await users.findByEmail('atelier@invite.bo')).not.toBeNull()
      expect(await users.findByEmail('otro@invite.bo')).toBeNull()
    })
  })

  it('guarda, encuentra, renueva y borra una sesión por su hash', async () => {
    await inRolledBackTransaction(async (tx) => {
      const users = createDrizzleUserRepository(tx)
      const sessions = createDrizzleSessionRepository(tx)
      const minter = createTokenMinter()

      const user = await users.create({ email: 'sesion@invite.bo', passwordHash: 'hash' })
      const { token, hash } = minter.mint()
      await sessions.create({ userId: user.id, tokenHash: hash, expiresAt: new Date('2026-09-19T00:00:00Z') })

      const found = await sessions.findByTokenHash(minter.hashOf(token))
      expect(found?.userId).toBe(user.id)

      const later = new Date('2026-10-19T00:00:00Z')
      await sessions.touch(found!.id, later)
      expect((await sessions.findByTokenHash(hash))?.expiresAt.toISOString()).toBe(later.toISOString())

      await sessions.deleteByTokenHash(hash)
      expect(await sessions.findByTokenHash(hash)).toBeNull()
    })
  })

  it('borra solo las sesiones ya caducadas', async () => {
    await inRolledBackTransaction(async (tx) => {
      const users = createDrizzleUserRepository(tx)
      const sessions = createDrizzleSessionRepository(tx)
      const minter = createTokenMinter()
      const user = await users.create({ email: 'barrido@invite.bo', passwordHash: 'hash' })

      const viva = minter.mint()
      const muerta = minter.mint()
      await sessions.create({ userId: user.id, tokenHash: viva.hash, expiresAt: new Date('2027-01-01T00:00:00Z') })
      await sessions.create({ userId: user.id, tokenHash: muerta.hash, expiresAt: new Date('2026-01-01T00:00:00Z') })

      expect(await sessions.deleteExpired(new Date('2026-08-19T00:00:00Z'))).toBe(1)
      expect(await sessions.findByTokenHash(viva.hash)).not.toBeNull()
      expect(await sessions.findByTokenHash(muerta.hash)).toBeNull()
    })
  })
})

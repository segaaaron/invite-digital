import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events } from '@/shared/db/schema'
import { createTokenMinter } from '@/shared/security/tokens'
import { createDrizzleClientShareRepository } from './drizzle-client-share-repository'

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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const seedEvent = async (tx: Tx) => {
  const [row] = await tx
    .insert(events)
    .values({
      slug: `share-${crypto.randomUUID().slice(0, 8)}`,
      title: 'Evento de prueba',
      eventDate: '2026-12-05',
      rsvpDeadline: '2026-11-20',
      locale: 'es',
      themeKey: 'clasico',
      status: 'live',
    })
    .returning({ id: events.id })
  return row!.id
}

const NOW = new Date('2026-08-19T12:00:00Z')

describe('repositorio de enlaces del cliente', () => {
  it('guarda, encuentra por hash y revoca', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleClientShareRepository(tx)
      const minter = createTokenMinter()
      const eventId = await seedEvent(tx)
      const id = crypto.randomUUID()
      const { token, hash } = minter.mint()

      await repo.insert({ id, eventId, tokenHash: hash, expiresAt: new Date('2026-10-01T00:00:00Z') })
      expect((await repo.findByTokenHash(minter.hashOf(token)))?.eventId).toBe(eventId)
      expect((await repo.findLiveByEvent(eventId, NOW))?.id).toBe(id)

      await repo.revoke(id, NOW)
      expect((await repo.findByTokenHash(hash))?.revokedAt).not.toBeNull()
      expect(await repo.findLiveByEvent(eventId, NOW)).toBeNull()
    })
  })

  it('no da por vivo un enlace caducado', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleClientShareRepository(tx)
      const eventId = await seedEvent(tx)
      const { hash } = createTokenMinter().mint()

      await repo.insert({ id: crypto.randomUUID(), eventId, tokenHash: hash, expiresAt: new Date('2026-01-01T00:00:00Z') })
      expect(await repo.findLiveByEvent(eventId, NOW)).toBeNull()
    })
  })
})

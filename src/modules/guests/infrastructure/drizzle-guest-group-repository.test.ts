import { describe, expect, it } from 'vitest'
import { db } from '@/shared/db/client'
import { events } from '@/shared/db/schema'
import { createTokenMinter } from '@/shared/security/tokens'
import { countGroupsByEvent, createDrizzleGuestGroupRepository } from './drizzle-guest-group-repository'

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

const seedEvent = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
  const [row] = await tx
    .insert(events)
    .values({
      slug: `repo-${crypto.randomUUID().slice(0, 8)}`,
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

describe('repositorio de grupos', () => {
  it('inserta, lista por evento y encuentra por hash', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleGuestGroupRepository(tx)
      const minter = createTokenMinter()
      const eventId = await seedEvent(tx)

      const primero = minter.mint()
      const segundo = minter.mint()
      await repo.insert({ id: crypto.randomUUID(), eventId, label: 'Familia Rojas', seats: 4, revokedAt: null, invitationSentAt: null, phone: null, createdAt: new Date(0) }, primero.hash)
      await repo.insert({ id: crypto.randomUUID(), eventId, label: 'Daniela Ortiz', seats: 1, revokedAt: null, invitationSentAt: null, phone: null, createdAt: new Date(0) }, segundo.hash)

      expect((await repo.listByEvent(eventId)).map((row) => row.label)).toEqual(['Familia Rojas', 'Daniela Ortiz'])
      // La insignia de la barra: el mismo número que la lista, sin traerla.
      expect(await countGroupsByEvent(tx, eventId)).toBe(2)
      expect((await repo.findByTokenHash(minter.hashOf(primero.token)))?.label).toBe('Familia Rojas')
      expect(await repo.findByTokenHash(Buffer.alloc(32, 255))).toBeNull()
    })
  })

  it('revoca sin borrar y marca la apertura una sola vez', async () => {
    await inRolledBackTransaction(async (tx) => {
      const repo = createDrizzleGuestGroupRepository(tx)
      const minter = createTokenMinter()
      const eventId = await seedEvent(tx)
      const id = crypto.randomUUID()
      const { hash } = minter.mint()

      await repo.insert({ id, eventId, label: 'Familia Rojas', seats: 4, revokedAt: null, invitationSentAt: null, phone: null, createdAt: new Date(0) }, hash)

      const primera = new Date('2026-08-19T12:00:00Z')
      await repo.markOpened(id, primera)
      await repo.markOpened(id, new Date('2026-08-20T12:00:00Z'))
      expect((await repo.findByTokenHash(hash))?.openedAt?.toISOString()).toBe(primera.toISOString())

      await repo.revoke(id, new Date('2026-08-21T12:00:00Z'))
      const revocado = await repo.findByTokenHash(hash)
      expect(revocado).not.toBeNull()
      expect(revocado?.revokedAt).not.toBeNull()
    })
  })
})

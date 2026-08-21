import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { db } from './client'
import { events, guestGroups, rsvpResponses } from './schema'

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

const evento = (slug: string) => ({
  slug,
  title: `Evento ${slug}`,
  eventDate: '2026-12-05',
  rsvpDeadline: '2026-11-20',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
})

describe('esquema del motor de invitaciones', () => {
  it('rechaza dos grupos con el mismo hash de token', async () => {
    await inRolledBackTransaction(async (tx) => {
      const [row] = await tx.insert(events).values(evento('boda-prueba')).returning({ id: events.id })
      const hash = Buffer.alloc(32, 7)
      await tx.insert(guestGroups).values({ eventId: row!.id, label: 'Familia A', seats: 2, tokenHash: hash })

      await expect(
        tx.insert(guestGroups).values({ eventId: row!.id, label: 'Familia B', seats: 1, tokenHash: hash }),
      ).rejects.toThrow()
    })
  })

  it('borra en cascada las respuestas al borrar el evento', async () => {
    await inRolledBackTransaction(async (tx) => {
      const [row] = await tx.insert(events).values(evento('cascada')).returning({ id: events.id })
      const [group] = await tx
        .insert(guestGroups)
        .values({ eventId: row!.id, label: 'Familia C', seats: 3, tokenHash: Buffer.alloc(32, 9) })
        .returning({ id: guestGroups.id })
      await tx.insert(rsvpResponses).values({ guestGroupId: group!.id, attending: 2 })

      await tx.delete(events).where(sql`${events.id} = ${row!.id}`)

      expect(await tx.select().from(rsvpResponses)).toHaveLength(0)
    })
  })

  it('tiene la extensión citext instalada', async () => {
    const rows = await db.execute(sql`select 1 from pg_extension where extname = 'citext'`)
    expect(rows.length).toBe(1)
  })
})

import { and, desc, eq, isNull } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { guestGroups, rsvpResponses } from '@/shared/db/schema'
import type { RsvpRepository } from '../application/ports'

export const createDrizzleRsvpRepository = (database: DbExecutor): RsvpRepository => ({
  async append(response) {
    await database.insert(rsvpResponses).values({
      id: response.id,
      guestGroupId: response.guestGroupId,
      attending: response.attending,
      message: response.message,
      respondedAt: response.respondedAt,
    })
  },

  async latestFor(guestGroupId) {
    const [row] = await database
      .select({
        attending: rsvpResponses.attending,
        message: rsvpResponses.message,
        respondedAt: rsvpResponses.respondedAt,
      })
      .from(rsvpResponses)
      .where(eq(rsvpResponses.guestGroupId, guestGroupId))
      .orderBy(desc(rsvpResponses.respondedAt))
      .limit(1)
    return row ?? null
  },

  async tallyRowsFor(eventId) {
    // `distinct on` deja la respuesta más reciente de cada grupo; el left join conserva
    // los grupos que aún no respondieron, con `attending` en null.
    const latest = database
      .selectDistinctOn([rsvpResponses.guestGroupId], {
        guestGroupId: rsvpResponses.guestGroupId,
        attending: rsvpResponses.attending,
      })
      .from(rsvpResponses)
      .orderBy(rsvpResponses.guestGroupId, desc(rsvpResponses.respondedAt))
      .as('latest')

    return database
      .select({ seats: guestGroups.seats, attending: latest.attending })
      .from(guestGroups)
      .leftJoin(latest, eq(latest.guestGroupId, guestGroups.id))
      // Un grupo revocado ya no cuenta como invitado: sus cupos no se van a ocupar.
      .where(and(eq(guestGroups.eventId, eventId), isNull(guestGroups.revokedAt)))
  },
})

export const drizzleRsvpRepository = createDrizzleRsvpRepository(db)

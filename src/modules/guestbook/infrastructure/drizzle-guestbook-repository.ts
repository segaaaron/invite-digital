import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { guestGroups, messageNotes, rsvpResponses } from '@/shared/db/schema'
import type { GuestbookRepository, MessageRow, NotePatch, ResponseContext } from '../application/ports'

/**
 * Solo las claves presentes en el parche. Un `set` con `undefined` dentro haría que
 * marcar leído borrase la respuesta que ya estaba escrita: cada acción toca su campo y
 * deja los demás en paz.
 */
const soloLoDefinido = (patch: NotePatch): Record<string, Date | string | null> => {
  const set: Record<string, Date | string | null> = {}
  if (patch.readAt !== undefined) set.readAt = patch.readAt
  if (patch.featuredAt !== undefined) set.featuredAt = patch.featuredAt
  if (patch.reply !== undefined) set.reply = patch.reply
  if (patch.repliedAt !== undefined) set.repliedAt = patch.repliedAt
  return set
}

export const createDrizzleGuestbookRepository = (database: DbExecutor): GuestbookRepository => ({
  async listMessages(eventId): Promise<MessageRow[]> {
    return database
      .select({
        responseId: rsvpResponses.id,
        guestGroupId: rsvpResponses.guestGroupId,
        groupLabel: guestGroups.label,
        body: rsvpResponses.message,
        writtenAt: rsvpResponses.respondedAt,
        readAt: messageNotes.readAt,
        featuredAt: messageNotes.featuredAt,
        reply: messageNotes.reply,
        repliedAt: messageNotes.repliedAt,
      })
      .from(rsvpResponses)
      .innerJoin(guestGroups, eq(guestGroups.id, rsvpResponses.guestGroupId))
      // **`leftJoin`, nunca `innerJoin`.** La nota nace cuando alguien marca leído,
      // destaca o responde: un mensaje recién escrito no la tiene. Con `innerJoin` solo
      // saldrían los mensajes que ya tienen nota —ninguno nuevo, jamás—, todo compilaría
      // y la bandeja quedaría vacía para siempre sin un solo error.
      .leftJoin(messageNotes, eq(messageNotes.rsvpResponseId, rsvpResponses.id))
      // Confirmar sin escribir nada no es una firma del libro. El filtro va aquí para no
      // arrastrar filas vacías desde la base hasta la pantalla.
      .where(and(eq(guestGroups.eventId, eventId), isNotNull(rsvpResponses.message)))
      .orderBy(desc(rsvpResponses.respondedAt))
  },

  /**
   * El último mensaje de un grupo. Mismo `leftJoin` por el mismo motivo: el invitado que
   * acaba de escribir todavía no tiene nota, y la consulta tiene que devolverlo igual
   * —con la respuesta a nulo— en vez de no devolver nada.
   */
  async findLatestMessageForGroup(guestGroupId): Promise<MessageRow | null> {
    const [row] = await database
      .select({
        responseId: rsvpResponses.id,
        guestGroupId: rsvpResponses.guestGroupId,
        groupLabel: guestGroups.label,
        body: rsvpResponses.message,
        writtenAt: rsvpResponses.respondedAt,
        readAt: messageNotes.readAt,
        featuredAt: messageNotes.featuredAt,
        reply: messageNotes.reply,
        repliedAt: messageNotes.repliedAt,
      })
      .from(rsvpResponses)
      .innerJoin(guestGroups, eq(guestGroups.id, rsvpResponses.guestGroupId))
      .leftJoin(messageNotes, eq(messageNotes.rsvpResponseId, rsvpResponses.id))
      .where(and(eq(rsvpResponses.guestGroupId, guestGroupId), isNotNull(rsvpResponses.message)))
      .orderBy(desc(rsvpResponses.respondedAt))
      .limit(1)

    return row ?? null
  },

  async findResponseEvent(responseId): Promise<ResponseContext | null> {
    const [row] = await database
      .select({
        responseId: rsvpResponses.id,
        eventId: guestGroups.eventId,
        readAt: messageNotes.readAt,
        featuredAt: messageNotes.featuredAt,
      })
      .from(rsvpResponses)
      .innerJoin(guestGroups, eq(guestGroups.id, rsvpResponses.guestGroupId))
      .leftJoin(messageNotes, eq(messageNotes.rsvpResponseId, rsvpResponses.id))
      .where(eq(rsvpResponses.id, responseId))
      .limit(1)

    return row ?? null
  },

  /**
   * `INSERT ... ON CONFLICT DO UPDATE` contra el `UNIQUE` de `rsvp_response_id`. Sin él
   * harían falta un SELECT y luego un INSERT o un UPDATE, y entre las dos consultas cabe
   * otra pestaña del panel marcando leído el mismo mensaje.
   */
  async upsertNote(responseId, patch): Promise<void> {
    const set = soloLoDefinido(patch)

    await database
      .insert(messageNotes)
      .values({ rsvpResponseId: responseId, ...set })
      .onConflictDoUpdate({ target: messageNotes.rsvpResponseId, set })
  },
})

export const drizzleGuestbookRepository = createDrizzleGuestbookRepository(db)

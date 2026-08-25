import { desc, eq, max } from 'drizzle-orm'
import { db, type DbExecutor } from '@/shared/db/client'
import { guestGroups, reminderLog, rsvpResponses } from '@/shared/db/schema'
import { REMINDER_KINDS, type ReminderCandidate, type ReminderKind } from '../domain/due'
import type { ReminderRepository } from '../application/ports'

const esMotivo = (valor: string): valor is ReminderKind => (REMINDER_KINDS as readonly string[]).includes(valor)

export const createDrizzleReminderRepository = (database: DbExecutor): ReminderRepository => ({
  /**
   * Los grupos del evento con lo último que se sabe de cada uno.
   *
   * La última respuesta y el último recordatorio por motivo se resuelven **en la base**,
   * con subconsultas agregadas. Traerlos fila a fila serían dos consultas más por grupo:
   * una boda de ochenta grupos son ciento sesenta viajes para pintar una lista.
   */
  async listCandidates(eventId): Promise<ReminderCandidate[]> {
    const ultimaRespuesta = database
      .select({ guestGroupId: rsvpResponses.guestGroupId, respondedAt: max(rsvpResponses.respondedAt).as('responded_at') })
      .from(rsvpResponses)
      .groupBy(rsvpResponses.guestGroupId)
      .as('ultima_respuesta')

    const filas = await database
      .select({
        id: guestGroups.id,
        label: guestGroups.label,
        phone: guestGroups.phone,
        seats: guestGroups.seats,
        revokedAt: guestGroups.revokedAt,
        sentAt: guestGroups.invitationSentAt,
        openedAt: guestGroups.openedAt,
        respondedAt: ultimaRespuesta.respondedAt,
      })
      .from(guestGroups)
      .leftJoin(ultimaRespuesta, eq(ultimaRespuesta.guestGroupId, guestGroups.id))
      .where(eq(guestGroups.eventId, eventId))
      .orderBy(desc(guestGroups.createdAt))

    // El registro de recordatorios va en una segunda consulta, no en otro `leftJoin`:
    // unir dos agregaciones distintas contra la misma tabla multiplica las filas.
    const anotados = await database
      .select({
        guestGroupId: reminderLog.guestGroupId,
        kind: reminderLog.kind,
        sentAt: max(reminderLog.sentAt).as('last_sent_at'),
      })
      .from(reminderLog)
      .innerJoin(guestGroups, eq(guestGroups.id, reminderLog.guestGroupId))
      .where(eq(guestGroups.eventId, eventId))
      .groupBy(reminderLog.guestGroupId, reminderLog.kind)

    const porGrupo = new Map<string, Partial<Record<ReminderKind, Date>>>()
    for (const fila of anotados) {
      if (fila.sentAt === null || !esMotivo(fila.kind)) continue
      const previo = porGrupo.get(fila.guestGroupId) ?? {}
      previo[fila.kind] = fila.sentAt
      porGrupo.set(fila.guestGroupId, previo)
    }

    return filas.map((fila) => ({
      id: fila.id,
      label: fila.label,
      phone: fila.phone,
      seats: fila.seats,
      revoked: fila.revokedAt !== null,
      sentAt: fila.sentAt ?? null,
      openedAt: fila.openedAt ?? null,
      respondedAt: fila.respondedAt ?? null,
      lastRemindedAt: porGrupo.get(fila.id) ?? {},
    }))
  },

  async findGroupEvent(guestGroupId): Promise<{ eventId: string } | null> {
    const [fila] = await database
      .select({ eventId: guestGroups.eventId })
      .from(guestGroups)
      .where(eq(guestGroups.id, guestGroupId))
      .limit(1)

    return fila ?? null
  },

  /**
   * Append-only: cada recordatorio deja su fila. Un `upsert` sobre la última perdería el
   * histórico, que es lo que deja ver que a un grupo se le insistió cuatro veces.
   */
  async logReminder(guestGroupId, kind, sentAt): Promise<void> {
    await database.insert(reminderLog).values({ guestGroupId, kind, sentAt })
  },
})

export const drizzleReminderRepository = createDrizzleReminderRepository(db)

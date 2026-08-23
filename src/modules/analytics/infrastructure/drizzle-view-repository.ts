import { desc, eq } from 'drizzle-orm'
import { db } from '@/shared/db/client'
import { invitationViews } from '@/shared/db/schema'
import type { ViewRepository } from '../application/ports'
import type { ViewRow } from '../domain/tally'
import type { Device, Source } from '../domain/view'

export const drizzleViewRepository: ViewRepository = {
  async record(view) {
    await db.insert(invitationViews).values({
      eventId: view.eventId,
      guestGroupId: view.guestGroupId,
      device: view.device,
      source: view.source,
      viewedAt: view.viewedAt,
    })
  },

  async listForEvent(eventId) {
    const filas = await db
      .select({ device: invitationViews.device, source: invitationViews.source, viewedAt: invitationViews.viewedAt })
      .from(invitationViews)
      .where(eq(invitationViews.eventId, eventId))
      .orderBy(desc(invitationViews.viewedAt))

    // El driver entrega las columnas de texto como cadenas; el CHECK de la tabla es quien
    // garantiza que solo hay categorías válidas.
    return filas.map((f: { device: string; source: string; viewedAt: Date }): ViewRow => ({ device: f.device as Device, source: f.source as Source, viewedAt: f.viewedAt }))
  },

  async deleteForEvent(eventId) {
    const borradas = await db
      .delete(invitationViews)
      .where(eq(invitationViews.eventId, eventId))
      .returning({ id: invitationViews.id })
    return borradas.length
  },

}

import type { InvitationView } from '../domain/view'
import type { ViewRow } from '../domain/tally'

export type ViewRepository = {
  record(view: InvitationView): Promise<void>
  listForEvent(eventId: string): Promise<ViewRow[]>
  /** Borra las visitas de un evento. La usa el mantenimiento al anonimizarlo. */
  deleteForEvent(eventId: string): Promise<number>
}

import type { ReminderCandidate, ReminderKind } from '../domain/due'
import type { ReminderRepository } from './ports'

/** Doble en memoria. Guarda lo anotado para que las pruebas comprueben qué se escribió. */
export class FakeReminderRepository implements ReminderRepository {
  readonly logged: { guestGroupId: string; kind: ReminderKind; sentAt: Date }[] = []

  constructor(
    private readonly candidates: ReminderCandidate[] = [],
    private readonly groupEvent: Record<string, string> = {},
  ) {}

  async listCandidates(): Promise<ReminderCandidate[]> {
    return this.candidates
  }

  async findGroupEvent(guestGroupId: string): Promise<{ eventId: string } | null> {
    const eventId = this.groupEvent[guestGroupId]
    return eventId === undefined ? null : { eventId }
  }

  async logReminder(guestGroupId: string, kind: ReminderKind, sentAt: Date): Promise<void> {
    this.logged.push({ guestGroupId, kind, sentAt })
  }
}

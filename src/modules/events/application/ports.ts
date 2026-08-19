import type { Event, EventInput } from '../domain/event'

export interface EventRepository {
  insert(event: Event): Promise<void>
  update(event: Event): Promise<void>
  listAll(): Promise<EventInput[]>
  findBySlug(slug: string): Promise<EventInput | null>
  findById(id: string): Promise<EventInput | null>
}

export type ClientShareRow = {
  id: string
  eventId: string
  expiresAt: Date
  revokedAt: Date | null
}

export interface ClientShareRepository {
  insert(share: { id: string; eventId: string; tokenHash: Buffer; expiresAt: Date }): Promise<void>
  findByTokenHash(tokenHash: Buffer): Promise<ClientShareRow | null>
  findLiveByEvent(eventId: string, now: Date): Promise<ClientShareRow | null>
  revoke(id: string, at: Date): Promise<void>
}

import type { Event, EventInput } from '../domain/event'

export interface EventRepository {
  insert(event: Event): Promise<void>
  update(event: Event): Promise<void>
  listAll(): Promise<EventInput[]>
  findBySlug(slug: string): Promise<EventInput | null>
  findById(id: string): Promise<EventInput | null>
}

import type { GuestGroup, GuestGroupInput } from '../domain/guest-group'

/** Lo que devuelve la base: el grupo más la telemetría de apertura, que el dominio ignora. */
export type GuestGroupRow = GuestGroupInput & { openedAt: Date | null }

export interface GuestGroupRepository {
  insert(group: GuestGroup, tokenHash: Buffer): Promise<void>
  listByEvent(eventId: string): Promise<GuestGroupRow[]>
  findByTokenHash(tokenHash: Buffer): Promise<GuestGroupRow | null>
  revoke(id: string, at: Date): Promise<void>
  markOpened(id: string, at: Date): Promise<void>
}

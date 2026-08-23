import type { GuestGroup, GuestGroupInput } from '../domain/guest-group'
import type { GuestPerson } from '../domain/person'

/** Lo que devuelve la base: el grupo más la telemetría de apertura, que el dominio ignora. */
export type GuestGroupRow = GuestGroupInput & {
  openedAt: Date | null
  invitationSentAt?: Date | null
  phone?: string | null
}

export interface GuestGroupRepository {
  insert(group: GuestGroup, tokenHash: Buffer): Promise<void>
  listByEvent(eventId: string): Promise<GuestGroupRow[]>
  findByTokenHash(tokenHash: Buffer): Promise<GuestGroupRow | null>
  revoke(id: string, at: Date): Promise<void>
  markOpened(id: string, at: Date): Promise<void>
  findById(id: string): Promise<GuestGroupRow | null>
  /** Marca el reparto de la invitación. `null` la devuelve a «sin enviar». */
  markSent(id: string, at: Date | null): Promise<void>
  /** Cambia el hash del token: el enlace anterior deja de abrir nada. */
  replaceToken(id: string, tokenHash: Buffer): Promise<void>
  setPhone(id: string, phone: string | null): Promise<void>
}

/**
 * Las personas de un grupo. Viven en su propio puerto: un grupo sin personas es válido, y
 * la mitad del panel no necesita leerlas.
 */
export interface GuestPersonRepository {
  insert(person: GuestPerson): Promise<void>
  update(person: GuestPerson): Promise<void>
  remove(id: string): Promise<void>
  listByGroup(guestGroupId: string): Promise<GuestPerson[]>
  listByEvent(eventId: string): Promise<GuestPerson[]>
  countInGroup(guestGroupId: string): Promise<number>
  findById(id: string): Promise<GuestPerson | null>
}

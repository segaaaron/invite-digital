import type { Event, EventInput } from '../domain/event'

export type AnonymizationCandidate = { id: string; slug: string; retentionDays: number; eventDate: string }

export interface EventRepository {
  /** Eventos cuya retención venció y que aún no se anonimizaron. */
  listPendingAnonymization(now: Date): Promise<AnonymizationCandidate[]>
  /** Renumera etiquetas, borra mensajes y marca la fecha. Conserva los agregados. */
  anonymize(eventId: string, at: Date): Promise<void>
  insert(event: Event): Promise<void>
  update(event: Event): Promise<void>
  listAll(): Promise<EventInput[]>
  /** Los eventos de un atelier. El admin usa `listAll`. */
  listByUser(userId: string): Promise<EventInput[]>
  /** Los eventos donde alguien es personal de puerta. */
  listByIds(ids: readonly string[]): Promise<EventInput[]>
  /** Cambia el dueño. Lo usa el admin al reasignar. */
  setOwner(eventId: string, userId: string): Promise<void>
  findBySlug(slug: string): Promise<EventInput | null>
  findById(id: string): Promise<EventInput | null>
  /** Borra el evento. La base se lleva en cascada invitados, mesas, regalos y mensajes. */
  remove(eventId: string): Promise<void>
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

/**
 * Quién es personal de puerta de qué evento.
 *
 * Va en su propio puerto y no dentro de `EventRepository` porque la pertenencia no es un
 * dato del evento: es un permiso, y se consulta **solo** cuando el actor es de puerta.
 */
export interface StaffReader {
  isStaffOf(eventId: string, userId: string): Promise<boolean>
  eventIdsOf(userId: string): Promise<string[]>
}

/**
 * El contenido rico de la invitación.
 *
 * Va en su propio puerto y no dentro de `EventRepository` por el mismo motivo que
 * `StaffReader`: es otra tabla, con su propio ciclo de vida —se siembra al elegir tema, se
 * edita bloque a bloque, se borra al vencer la retención— y la mayoría de las pantallas
 * del panel no lo tocan.
 *
 * `blocks` entra y sale como `unknown` a propósito: es un `jsonb`, y quien decide qué es
 * un contenido válido es `domain/invitation-content.ts`, no el repositorio.
 */
export interface ContentRepository {
  find(eventId: string): Promise<unknown>
  save(eventId: string, blocks: unknown): Promise<void>
  clear(eventId: string): Promise<void>
}

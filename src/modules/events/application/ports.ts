import type { Membership } from '@/modules/identity'
import type { Event, EventInput } from '../domain/event'
import type { ImageType } from '../domain/media'

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

export type { Membership } from '@/modules/identity'


/**
 * Quién pertenece a qué evento, y como qué.
 *
 * Va en su propio puerto y no dentro de `EventRepository` porque la pertenencia no es un
 * dato del evento: es un permiso, y se consulta **solo** cuando el actor no es dueño ni
 * admin.
 */
export interface StaffReader {
  /** Cómo pertenece este usuario a este evento. Vacía si no pertenece. */
  membershipsOf(eventId: string, userId: string): Promise<Membership[]>
  /** Los eventos donde pertenece con alguna de estas clases. */
  eventIdsOf(userId: string, memberships: readonly Membership[]): Promise<string[]>
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

/**
 * Las imágenes de una invitación.
 *
 * El fichero y la fila van por separado a propósito: el fichero vive en disco —fuera de
 * `public/`— y la fila en Postgres. Borrar el evento se lleva la fila por cascada; el
 * fichero lo barre la retención, que es la única que sabe cuándo un evento venció.
 */
export interface MediaStorage {
  put(key: string, bytes: Uint8Array): Promise<void>
  get(key: string): Promise<Uint8Array | null>
  remove(key: string): Promise<void>
}

/**
 * Quien deja una fotografía lista para servirse: la reduce, la reencoda y le quita todo
 * lo que no sea la imagen.
 *
 * Es un puerto y no una llamada directa a `sharp` porque `application` no habla con
 * `infrastructure`, y porque reencodar de verdad en cada prueba del caso de uso sería
 * medio segundo por prueba para comprobar una decisión que no es de imagen.
 *
 * Devuelve `null` cuando no puede decodificar lo que le dan. No lanza: un fichero roto es
 * una respuesta, no una avería.
 */
export interface ImageProcessor {
  // `ImageType` y no `MediaType`: desde que el audio vive en esta misma tabla, un
  // reencodador podría afirmar por tipos que devolvió un MP3. Reencodar es de imagen.
  normalize(bytes: Uint8Array): Promise<{ bytes: Uint8Array; contentType: ImageType } | null>
}

export type MediaRow = {
  readonly id: string
  readonly eventId: string
  readonly contentType: string
  readonly originalName: string
  readonly byteSize: number
  /** El grupo que la subió, o `null` si la subió el atelier. */
  readonly uploadedByGroupId: string | null
}

export interface MediaRepository {
  insert(row: MediaRow): Promise<void>
  find(id: string): Promise<MediaRow | null>
  listByEvent(eventId: string): Promise<readonly MediaRow[]>
  /** Lo que lleva subido un grupo: es lo que aplica el tope del extremo sin sesión. */
  countByGroup(groupId: string): Promise<number>
  listByGroup(groupId: string): Promise<readonly MediaRow[]>
  remove(id: string): Promise<void>
}

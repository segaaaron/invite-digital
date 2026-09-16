import type { GuestGroup, GuestGroupInput } from '../domain/guest-group'
import type { GuestPerson } from '../domain/person'

/** Lo que devuelve la base: el grupo más la telemetría de apertura, que el dominio ignora. */
export type GuestGroupRow = GuestGroupInput & {
  openedAt: Date | null
  invitationSentAt?: Date | null
  phone?: string | null
}

/**
 * **Todo lo que se busca o se escribe por identificador lleva el evento delante**, y el
 * adaptador filtra por los dos. El identificador llega del navegador; el evento, de la
 * guardia que acaba de comprobar la sesión. Sin el evento en la consulta, un id copiado
 * de otra boda se escribía allí aunque la guardia hubiera mirado la boda propia.
 *
 * Solo `findByTokenHash` y `markOpened` van sin evento: los usa el invitado, que se
 * autoriza por el token y no tiene sesión.
 */
export interface GuestGroupRepository {
  insert(group: GuestGroup, tokenHash: Buffer): Promise<void>
  listByEvent(eventId: string): Promise<GuestGroupRow[]>
  findByTokenHash(tokenHash: Buffer): Promise<GuestGroupRow | null>
  markOpened(id: string, at: Date): Promise<void>
  findById(eventId: string, id: string): Promise<GuestGroupRow | null>
  revoke(eventId: string, id: string, at: Date): Promise<void>
  /** Marca el reparto de la invitación. */
  markSent(eventId: string, id: string, at: Date): Promise<void>
  /** Cambia el hash del token: el enlace anterior deja de abrir nada. */
  replaceToken(eventId: string, id: string, tokenHash: Buffer): Promise<void>
  setPhone(eventId: string, id: string, phone: string | null): Promise<void>
  /**
   * Permite a esa invitación contestar **otra vez**.
   *
   * Se confirma una sola vez porque el enlace acaba en el chat de toda la familia. Cuando
   * alguien se equivoca, el atelier reabre su respuesta desde el panel; la marca solo vale
   * para la que venga después.
   */
  reopenRsvp(eventId: string, id: string, when: Date): Promise<void>
  setSeats(eventId: string, id: string, seats: number): Promise<void>
  setLabel(eventId: string, id: string, label: string): Promise<void>
  /**
   * Borra la invitación, con sus respuestas y su historial. Lo usan el alta, para deshacer
   * una invitación cuya persona no llegó a entrar, y la baja de su última persona: una
   * invitación sin nadie dentro no la ve nadie en el panel y seguiría abriendo.
   */
  remove(eventId: string, id: string): Promise<void>
}

/** Las personas de una invitación. Lo que va por identificador, también con el evento. */
export interface GuestPersonRepository {
  insert(person: GuestPerson): Promise<void>
  /** Escribe también la invitación a la que pertenece: mover es editar ese campo. */
  update(eventId: string, person: GuestPerson): Promise<void>
  remove(eventId: string, id: string): Promise<void>
  /** Por orden de alta: la primera que quede es la que pasa a principal. */
  listByGroup(guestGroupId: string): Promise<GuestPerson[]>
  listByEvent(eventId: string): Promise<GuestPerson[]>
  countInGroup(guestGroupId: string): Promise<number>
  findById(eventId: string, id: string): Promise<GuestPerson | null>
}

import { isFeatured, isUnread } from './message-note'

/**
 * Un mensaje del libro de firmas tal y como se lee: el texto y el instante vienen de
 * `rsvp_responses`, que es inmutable, y el estado editable de `message_notes`.
 *
 * Un invitado que cambia su respuesta genera **otra** fila de RSVP con **otro** mensaje.
 * Los dos aparecen en el libro, en su orden: dijo dos cosas distintas en dos momentos.
 */
export type GuestMessage = {
  readonly responseId: string
  readonly guestGroupId: string
  readonly groupLabel: string
  /** Quién de ese grupo escribió. El enlace es del grupo; el mensaje, de una persona. */
  readonly responderName: string | null
  readonly body: string
  readonly writtenAt: Date
  readonly readAt: Date | null
  readonly featuredAt: Date | null
  readonly reply: string | null
  readonly repliedAt: Date | null
}

export const INBOX_FILTERS = ['all', 'unread', 'featured'] as const
export type InboxFilter = (typeof INBOX_FILTERS)[number]

const CUMPLE: Record<InboxFilter, (message: GuestMessage) => boolean> = {
  all: () => true,
  unread: isUnread,
  featured: isFeatured,
}

/**
 * Filtra y **siempre** ordena por fecha de escritura descendente. El orden no es un
 * parámetro: el libro de firmas se lee de lo último a lo primero, y dejar que cada
 * pantalla eligiera acabaría con dos vistas del mismo libro en órdenes distintos.
 *
 * Copia antes de ordenar: `sort` muta, y la lista de entrada puede ser la que la página
 * ya está pintando.
 */
export const filterMessages = (
  messages: readonly GuestMessage[],
  filter: InboxFilter,
): readonly GuestMessage[] =>
  messages.filter(CUMPLE[filter]).sort((a, b) => b.writtenAt.getTime() - a.writtenAt.getTime())

export const unreadCount = (messages: readonly GuestMessage[]): number => messages.filter(isUnread).length

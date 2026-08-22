import type { GuestbookRepository, MessageRow, NotePatch, ResponseContext } from './ports'

export type FakeNote = {
  responseId: string
  readAt: Date | null
  featuredAt: Date | null
  reply: string | null
  repliedAt: Date | null
}

/** Una respuesta de RSVP tal y como está en la base, con su evento. */
export type FakeResponse = {
  responseId: string
  eventId: string
  guestGroupId: string
  groupLabel: string
  body: string | null
  writtenAt: Date
}

export type FakeGuestbook = {
  repo: GuestbookRepository
  notes: Map<string, FakeNote>
  /** Cuántas veces se escribió: sirve para comprobar que marcar leído no duplica. */
  upserts: number
}

const VACIA = (responseId: string): FakeNote => ({
  responseId,
  readAt: null,
  featuredAt: null,
  reply: null,
  repliedAt: null,
})

/**
 * Repositorio en memoria con el mismo contrato que el de Postgres. Lo que importa que
 * imite es la unión por la izquierda: una respuesta **sin nota** sale igual en la lista.
 * Un falso que solo devolviera lo que ya tiene nota describiría un mundo donde ningún
 * mensaje nuevo aparece jamás, que es exactamente el fallo que esta rebanada vigila.
 */
export const fakeGuestbookRepository = (initial: {
  responses?: FakeResponse[]
  notes?: FakeNote[]
}): FakeGuestbook => {
  const responses = [...(initial.responses ?? [])]
  const notes = new Map((initial.notes ?? []).map((n) => [n.responseId, n]))
  const state = { upserts: 0 }

  const repo: GuestbookRepository = {
    async listMessages(eventId): Promise<MessageRow[]> {
      return responses
        .filter((r) => r.eventId === eventId && r.body !== null)
        .map((r) => {
          const note = notes.get(r.responseId) ?? VACIA(r.responseId)
          return {
            responseId: r.responseId,
            guestGroupId: r.guestGroupId,
            groupLabel: r.groupLabel,
            body: r.body,
            writtenAt: r.writtenAt,
            readAt: note.readAt,
            featuredAt: note.featuredAt,
            reply: note.reply,
            repliedAt: note.repliedAt,
          }
        })
    },

    async findResponseEvent(responseId): Promise<ResponseContext | null> {
      const response = responses.find((r) => r.responseId === responseId)
      if (!response) return null
      const note = notes.get(responseId) ?? VACIA(responseId)
      return {
        responseId,
        eventId: response.eventId,
        readAt: note.readAt,
        featuredAt: note.featuredAt,
      }
    },

    async upsertNote(responseId, patch: NotePatch): Promise<void> {
      state.upserts += 1
      const actual = notes.get(responseId) ?? VACIA(responseId)
      notes.set(responseId, { ...actual, ...patch })
    },
  }

  return {
    repo,
    notes,
    get upserts() {
      return state.upserts
    },
  }
}

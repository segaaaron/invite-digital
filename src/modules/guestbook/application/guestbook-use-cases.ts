import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { guestbookError, type GuestbookError } from '../domain/errors'
import { filterMessages, type GuestMessage } from '../domain/inbox'
import { createReply } from '../domain/message-note'
import type { GuestbookRepository, ResponseContext } from './ports'

type Deps = { guestbook: GuestbookRepository }
type WithClock = Deps & { clock: () => Date }

type Target = { responseId: string; eventId: string }

/**
 * La respuesta pedida, ya comprobada contra el evento del que dice ser. La comprobación
 * vive en el servidor: un identificador copiado del libro de otra boda no puede tocar
 * esta.
 */
const owned = async (deps: Deps, target: Target): Promise<Result<ResponseContext, GuestbookError>> => {
  const context = await deps.guestbook.findResponseEvent(target.responseId)
  if (!context) return err(guestbookError('not_found', `No existe la respuesta ${target.responseId}.`))
  if (context.eventId !== target.eventId) {
    return err(guestbookError('wrong_event', 'Ese mensaje es de otro evento.'))
  }
  return ok(context)
}

/**
 * El libro de firmas del evento, del último al primero.
 *
 * Las respuestas de RSVP **sin mensaje** se quedan fuera: confirmar sin escribir nada es
 * normal y no es una firma del libro. El estrechado de `body` a `string` no es una regla
 * añadida, es la única forma de componer un `GuestMessage` a partir de una fila cuyo
 * cuerpo es anulable.
 */
export const listGuestbook =
  (deps: Deps) =>
  async (eventId: string): Promise<Result<readonly GuestMessage[], GuestbookError>> =>
    attempt<readonly GuestMessage[], GuestbookError>(
      async () => {
        const rows = await deps.guestbook.listMessages(eventId)

        const messages: GuestMessage[] = []
        for (const row of rows) {
          if (row.body === null) continue
          messages.push({ ...row, body: row.body })
        }

        return ok(filterMessages(messages, 'all'))
      },
      (cause) => guestbookError('storage_failure', `No se pudo leer el libro de firmas: ${String(cause)}`),
    )

/**
 * Marca leído. Si ya lo estaba **no vuelve a escribir**: el instante que vale es el de la
 * primera lectura, y sobrescribirlo cada vez que la bandeja se refresca convertiría el
 * dato en «la última vez que miré la pantalla», que no es lo que la columna dice.
 */
export const markRead =
  (deps: WithClock) =>
  async (target: Target): Promise<Result<void, GuestbookError>> =>
    attempt<void, GuestbookError>(
      async () => {
        const context = await owned(deps, target)
        if (isErr(context)) return context

        if (context.value.readAt !== null) return ok(undefined)

        await deps.guestbook.upsertNote(target.responseId, { readAt: deps.clock() })
        return ok(undefined)
      },
      (cause) => guestbookError('storage_failure', `No se pudo marcar el mensaje como leído: ${String(cause)}`),
    )

/** Destaca o deja de destacar. La pareja querrá releer unos pocos, no todos. */
export const toggleFeatured =
  (deps: WithClock) =>
  async (target: Target): Promise<Result<boolean, GuestbookError>> =>
    attempt<boolean, GuestbookError>(
      async () => {
        const context = await owned(deps, target)
        if (isErr(context)) return context

        const destacar = context.value.featuredAt === null
        await deps.guestbook.upsertNote(target.responseId, { featuredAt: destacar ? deps.clock() : null })
        return ok(destacar)
      },
      (cause) => guestbookError('storage_failure', `No se pudo destacar el mensaje: ${String(cause)}`),
    )

/**
 * Responde a un mensaje. Una respuesta por mensaje: volver a responder **sustituye** la
 * anterior. No hay hilo de conversación, y no lo hay a propósito.
 */
export const replyToMessage =
  (deps: WithClock) =>
  async (input: Target & { text: string }): Promise<Result<string, GuestbookError>> =>
    attempt<string, GuestbookError>(
      async () => {
        // El texto se valida antes de tocar la base: una respuesta vacía no merece un
        // viaje de ida y vuelta.
        const reply = createReply(input.text)
        if (isErr(reply)) return reply

        const context = await owned(deps, input)
        if (isErr(context)) return context

        await deps.guestbook.upsertNote(input.responseId, { reply: reply.value, repliedAt: deps.clock() })
        return ok(reply.value)
      },
      (cause) => guestbookError('storage_failure', `No se pudo guardar la respuesta: ${String(cause)}`),
    )

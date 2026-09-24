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

/**
 * La respuesta de los anfitriones al último mensaje de este grupo, para su propia página.
 *
 * Devuelve solo el texto: la página del invitado no tiene por qué saber si su mensaje
 * está leído o destacado, y esas dos cosas son decisiones internas del atelier.
 *
 * Un fallo de lectura no se propaga como error: la invitación tiene que abrirse aunque el
 * libro de firmas no responda. Sin respuesta y con la base caída se ven igual —sin nada—,
 * y esa es la degradación correcta para un adorno.
 */
export const getGuestReply =
  (deps: Deps) =>
  async (guestGroupId: string): Promise<string | null> => {
    try {
      const row = await deps.guestbook.findLatestMessageForGroup(guestGroupId)
      return row?.reply ?? null
    } catch {
      return null
    }
  }

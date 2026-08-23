import { attempt, err, ok, type Result } from '@/shared/result'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

/**
 * Borra un evento entero.
 *
 * **Exige que quien lo pide escriba el identificador del evento.** No es un adorno: la
 * base borra en cascada invitados, mesas, regalos, mensajes y visitas, y no hay papelera
 * ni deshacer. Un botón que borra una boda con un clic acaba borrando una boda con un
 * clic.
 *
 * La comprobación va **en el caso de uso**, no en el formulario: la acción es un extremo
 * HTTP público y un `fetch` a mano se salta cualquier diálogo.
 */
export const deleteEvent =
  (deps: { events: EventRepository }) =>
  async (input: { eventId: string; confirmation: string }): Promise<Result<null, EventError>> =>
    attempt<null, EventError>(
      async () => {
        const row = await deps.events.findById(input.eventId)
        if (row === null) return err(eventError('not_found', 'El evento no existe'))

        if (input.confirmation.trim() !== row.slug) {
          return err(
            eventError(
              'invalid_slug',
              `Para borrar el evento hay que escribir su identificador exacto: ${row.slug}`,
            ),
          )
        }

        await deps.events.remove(input.eventId)
        return ok(null)
      },
      (cause) => eventError('storage_failure', `No se pudo borrar el evento: ${String(cause)}`),
    )

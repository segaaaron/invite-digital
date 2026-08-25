import { attempt, err, ok, type Result } from '@/shared/result'
import { dueReminders, type DueReminder, type ReminderKind } from '../domain/due'
import { remindersError, type RemindersError } from '../domain/errors'
import type { ReminderEvent, ReminderRepository } from './ports'

type Deps = { reminders: ReminderRepository; clock: () => Date }

/**
 * La cola de recordatorios del día.
 *
 * El día se toma **una sola vez**, aquí, y baja al dominio como argumento. Que el reloj
 * viva en la frontera es lo que deja `dueReminders` reproducible: la cola de la víspera
 * del cierre se prueba sin tocar el reloj del sistema.
 */
export const listDueReminders = (deps: Deps) =>
  async (event: ReminderEvent): Promise<Result<DueReminder[], RemindersError>> =>
    attempt(
      async () => {
        const candidatos = await deps.reminders.listCandidates(event.id)
        return ok(dueReminders({ groups: candidatos, deadline: event.rsvpDeadline, today: deps.clock() }))
      },
      (cause) => remindersError('storage_failure', `No se pudo leer la cola de recordatorios: ${String(cause)}`),
    )

/**
 * Deja constancia de que este grupo ya fue recordado por este motivo.
 *
 * Se comprueba **en el servidor** que el grupo es de este evento: el identificador llega
 * de un formulario, y uno copiado de otra boda no puede escribir aquí.
 */
export const markReminderSent = (deps: Deps) =>
  async (input: {
    eventId: string
    guestGroupId: string
    kind: ReminderKind
  }): Promise<Result<null, RemindersError>> =>
    attempt(
      async () => {
        const grupo = await deps.reminders.findGroupEvent(input.guestGroupId)
        if (grupo === null || grupo.eventId !== input.eventId) {
          return err(remindersError('not_found', `El grupo ${input.guestGroupId} no es de este evento.`))
        }

        await deps.reminders.logReminder(input.guestGroupId, input.kind, deps.clock())
        return ok(null)
      },
      (cause) => remindersError('storage_failure', `No se pudo anotar el recordatorio: ${String(cause)}`),
    )

import { attempt, isErr, ok, type Result } from '@/shared/result'
import { createEvent } from '../domain/event'
import { demoVencida } from '../domain/demo'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

export type MaintenanceReport = {
  readonly eventsAnonymized: readonly string[]
  /** Las demos que vencieron y se borraron enteras en este pase. */
  readonly demosBorradas: readonly string[]
  readonly sessionsDeleted: number
  readonly viewsDeleted: number
  readonly mediaDeleted: number
}

/**
 * Los invitados no son clientes del atelier y no aceptaron ningún término: pasado el
 * plazo de retención se conserva el agregado —cupos y asistentes— y se borra lo que
 * identifica: la etiqueta del grupo y el mensaje.
 *
 * Se aprovecha el mismo pase para barrer sesiones caducadas, que es la otra tabla que
 * crece sola.
 */
export const anonymizeExpiredEvents =
  (deps: {
    events: EventRepository
    deleteExpiredSessions: (now: Date) => Promise<number>
    /**
     * Las visitas de un evento vencido se **borran**, no se anonimizan: no identifican a
     * nadie, pero sin el evento no sirven de nada y son la tabla que más crece.
     */
    deleteViewsForEvent: (eventId: string) => Promise<number>
    /**
     * El contenido de la invitación se **vacía**: los nombres de los padres, la
     * dedicatoria y la firma son datos personales escritos por el atelier sobre personas
     * reales, y hasta ahora no había nada que los barriera.
     */
    clearContentForEvent: (eventId: string) => Promise<void>
    /**
     * Y las fotografías se **borran del disco**. Un retrato de la novia no es un agregado
     * que convenga conservar, y es lo único de todo esto que ocupa megabytes.
     */
    purgeMediaForEvent: (eventId: string) => Promise<number>
    clock: () => Date
    /**
     * Dónde se cuenta lo que se rompió sin parar el pase. El mantenimiento corre fuera de una petición,
     * así que esto acaba en el registro de fallos que el admin lee en Ajustes, no solo en el log del
     * contenedor, que es donde se quedaba todo hasta ahora.
     */
    avisar: (mensaje: string, ...datos: unknown[]) => void
  }) =>
  async (): Promise<Result<MaintenanceReport, EventError>> =>
    attempt<MaintenanceReport, EventError>(
      async () => {
        const now = deps.clock()
        const pending = await deps.events.listPendingAnonymization(now)

        const anonymized: string[] = []
        let viewsDeleted = 0
        let mediaDeleted = 0
        for (const event of pending) {
          await deps.events.anonymize(event.id, now)
          viewsDeleted += await deps.deleteViewsForEvent(event.id)
          await deps.clearContentForEvent(event.id)
          mediaDeleted += await deps.purgeMediaForEvent(event.id)
          anonymized.push(event.slug)
        }

        /**
         * **La demo vencida se borra entera**, no se anonimiza: nació para durar un día y no hay agregado
         * que conservar. Las fotos primero —son lo único que vive fuera de la base—, y la fila después,
         * que se lleva en cascada invitados, contenido, mesas y mensajes.
         *
         * Cada una va por su cuenta, de verdad: lo que falle con una se cuenta en el registro y las demás
         * siguen. El pase entero solo se cae si se cae la lectura de la lista.
         */
        const demosBorradas: string[] = []
        for (const fila of await deps.events.listDemos()) {
          const demo = createEvent(fila)
          if (isErr(demo)) {
            // Una fila que no se puede construir no se puede borrar, y callar la dejaba en la base para
            // siempre con sus fotos. Se dice y se sigue: las demás sí se van.
            deps.avisar('no se pudo leer una demo para borrarla', demo.error.kind, demo.error.detail)
            continue
          }
          if (!demoVencida(demo.value, now)) continue
          try {
            mediaDeleted += await deps.purgeMediaForEvent(demo.value.id)
            await deps.events.remove(demo.value.id)
            demosBorradas.push(demo.value.slug)
          } catch (causa) {
            // **Una demo atascada no puede tumbar el pase.** Sin esto, un disco lleno o un bloqueo en una
            // sola fila se llevaba por delante el informe de lo ya anonimizado y el barrido de sesiones.
            deps.avisar('no se pudo borrar la demo vencida', 'storage_failure', demo.value.slug, causa)
          }
        }

        return ok({
          eventsAnonymized: anonymized,
          demosBorradas,
          sessionsDeleted: await deps.deleteExpiredSessions(now),
          viewsDeleted,
          mediaDeleted,
        })
      },
      (cause) => eventError('storage_failure', `Falló el mantenimiento: ${String(cause)}`),
    )

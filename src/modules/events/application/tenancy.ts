import { canAccessEvent, isAdmin, type Actor } from '@/modules/identity/domain/access'
import { attempt, err, isErr, isOk, ok, type Result } from '@/shared/result'
import { createEvent, type Event } from '../domain/event'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository } from './ports'

/**
 * El evento de este actor.
 *
 * **Existe para que olvidarse del actor sea un error de tipos.** `getEventBySlug(slug)`
 * seguía compilando en una página que no comprobaba nada; esto no se puede llamar sin
 * decir quién pregunta.
 *
 * Un evento que existe pero no es suyo devuelve **`not_found`**, no un error de permiso:
 * un 403 confirmaría que ese `slug` existe, que es justo lo que no debe averiguar quien no
 * tiene nada que hacer ahí. Es la misma regla que los tokens de invitado.
 */
export const getEventFor =
  (deps: { events: EventRepository }) =>
  async (actor: Actor, slug: string): Promise<Result<Event, EventError>> =>
    attempt<Event, EventError>(
      async () => {
        const row = await deps.events.findBySlug(slug)
        if (row === null) return err(eventError('not_found', `No existe el evento ${slug}`))

        const event = createEvent(row)
        if (isErr(event)) return event
        if (!canAccessEvent(actor, event.value)) {
          return err(eventError('not_found', `El evento ${slug} no es de ${actor.email}`))
        }

        return ok(event.value)
      },
      (cause) => eventError('storage_failure', `No se pudo leer el evento ${slug}: ${String(cause)}`),
    )

/** Lo mismo por identificador, para las acciones que reciben `eventId` de un formulario. */
export const getEventByIdFor =
  (deps: { events: EventRepository }) =>
  async (actor: Actor, id: string): Promise<Result<Event, EventError>> =>
    attempt<Event, EventError>(
      async () => {
        const row = await deps.events.findById(id)
        if (row === null) return err(eventError('not_found', `No existe el evento ${id}`))

        const event = createEvent(row)
        if (isErr(event)) return event
        if (!canAccessEvent(actor, event.value)) {
          return err(eventError('not_found', `El evento ${id} no es de ${actor.email}`))
        }

        return ok(event.value)
      },
      (cause) => eventError('storage_failure', `No se pudo leer el evento ${id}: ${String(cause)}`),
    )

/**
 * La bandeja del actor: el admin ve todos, el atelier los suyos.
 *
 * El filtro va **en la consulta**, no en un `filter` sobre todo lo leído: con cien
 * atelieres, traer la base entera para quedarse con tres eventos es traer noventa y siete
 * títulos de boda ajenos a la memoria del proceso.
 */
export const listEventsFor =
  (deps: { events: EventRepository }) =>
  async (actor: Actor): Promise<Result<Event[], EventError>> =>
    attempt<Event[], EventError>(
      async () => {
        const rows = isAdmin(actor) ? await deps.events.listAll() : await deps.events.listByUser(actor.userId)
        const built: Event[] = []

        for (const row of rows) {
          const event = createEvent(row)
          if (isErr(event)) return event
          built.push(event.value)
        }

        return ok(built)
      },
      (cause) => eventError('storage_failure', `No se pudo leer la lista de eventos: ${String(cause)}`),
    )

/** Lo usa la guardia de las Server Actions, que solo necesita un sí o un no. */
export const actorCanTouchEvent =
  (deps: { events: EventRepository }) =>
  async (actor: Actor, ref: { eventId?: string | undefined; eventSlug?: string | undefined }): Promise<boolean> => {
    if (ref.eventId !== undefined) {
      const porId = await getEventByIdFor(deps)(actor, ref.eventId)
      if (!isOk(porId)) return false
    }
    if (ref.eventSlug !== undefined) {
      const porSlug = await getEventFor(deps)(actor, ref.eventSlug)
      if (!isOk(porSlug)) return false
    }
    // Sin ninguna referencia no hay nada que comprobar, y eso es un error de quien llama:
    // la guardia existe justo para las acciones que sí tocan un evento.
    return ref.eventId !== undefined || ref.eventSlug !== undefined
  }

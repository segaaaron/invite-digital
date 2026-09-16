import { type Actor, canAccessEvent, type EventSection, isAdmin } from '@/modules/identity'
import { attempt, err, isErr, isOk, ok, type Result } from '@/shared/result'
import { createEvent, type Event } from '../domain/event'
import { eventError, type EventError } from '../domain/errors'
import type { EventRepository, StaffReader } from './ports'

/**
 * La sección que se pide. **`full` por omisión**, y `full` deniega al personal de puerta:
 * una página nueva que no diga su sección hereda la más restrictiva. El olvido cae del
 * lado seguro.
 */
type Opciones = { section?: EventSection | undefined }

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
  (deps: { events: EventRepository; staff: StaffReader }) =>
  async (actor: Actor, slug: string, opciones: Opciones = {}): Promise<Result<Event, EventError>> =>
    attempt<Event, EventError>(
      async () => {
        const row = await deps.events.findBySlug(slug)
        if (row === null) return err(eventError('not_found', `No existe el evento ${slug}`))

        const event = createEvent(row)
        if (isErr(event)) return event
        if (!(await permitido(deps, actor, event.value, opciones))) {
          return err(eventError('not_found', `El evento ${slug} no es de ${actor.email}`))
        }

        return ok(event.value)
      },
      (cause) => eventError('storage_failure', `No se pudo leer el evento ${slug}: ${String(cause)}`),
    )

/**
 * La pertenencia solo se consulta si el actor entra por ella —puerta o cliente—: para un
 * atelier o un admin la respuesta no depende de ella, y sería un viaje más a la base en
 * cada página del panel.
 *
 * La clase que se consulta es **la de su rol**, nunca «cualquiera»: preguntar sin filtro
 * dejaría al cliente entrando por la pertenencia de la puerta y al revés.
 */
async function permitido(
  deps: { staff: StaffReader },
  actor: Actor,
  event: Event,
  opciones: Opciones,
): Promise<boolean> {
  // Sin viaje a la base cuando la respuesta no depende de la pertenencia.
  // El admin no toma el atajo: su acceso depende de la sección.
  if (actor.role === 'atelier' && event.userId !== null && event.userId === actor.userId) return true
  if (isAdmin(actor)) return canAccessEvent(actor, event, { section: opciones.section })
  const memberships = await deps.staff.membershipsOf(event.id, actor.userId)
  return canAccessEvent(actor, event, { section: opciones.section, memberships })
}

/** Lo mismo por identificador, para las acciones que reciben `eventId` de un formulario. */
export const getEventByIdFor =
  (deps: { events: EventRepository; staff: StaffReader }) =>
  async (actor: Actor, id: string, opciones: Opciones = {}): Promise<Result<Event, EventError>> =>
    attempt<Event, EventError>(
      async () => {
        const row = await deps.events.findById(id)
        if (row === null) return err(eventError('not_found', `No existe el evento ${id}`))

        const event = createEvent(row)
        if (isErr(event)) return event
        if (!(await permitido(deps, actor, event.value, opciones))) {
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
  (deps: { events: EventRepository; staff: StaffReader }) =>
  async (actor: Actor): Promise<Result<Event[], EventError>> =>
    attempt<Event[], EventError>(
      async () => {
        // El personal de puerta ve los eventos donde trabaja, y solo para llegar a su
        // check-in: la bandeja es su única forma de elegir boda cuando cubre dos la misma
        // semana. El cliente, la suya —casi siempre una—, por la misma vía.
        //
        // Ninguno de los dos aparece en `listByUser`: no son dueños de nada. El dueño
        // sigue siendo el atelier que vendió la boda.
        // El atelier ve los suyos **y** aquellos donde lo sumaron como planner: una planner
        // puede tener cuenta de atelier propia.
        const EQUIPO = ['cliente', 'coanfitrion', 'planner'] as const
        const rows = isAdmin(actor)
          ? await deps.events.listAll()
          : actor.role === 'puerta'
            ? await deps.events.listByIds(await deps.staff.eventIdsOf(actor.userId, ['puerta']))
            : actor.role === 'cliente'
              ? await deps.events.listByIds(await deps.staff.eventIdsOf(actor.userId, EQUIPO))
              : [
                  ...(await deps.events.listByUser(actor.userId)),
                  ...(await deps.events.listByIds(await deps.staff.eventIdsOf(actor.userId, EQUIPO))).filter((r) => r.userId !== actor.userId),
                ]
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
  (deps: { events: EventRepository; staff: StaffReader }) =>
  async (
    actor: Actor,
    ref: { eventId?: string | undefined; eventSlug?: string | undefined; section?: EventSection },
  ): Promise<string | null> => {
    const opciones = { section: ref.section }
    let eventId: string | null = null
    if (ref.eventId !== undefined) {
      const porId = await getEventByIdFor(deps)(actor, ref.eventId, opciones)
      if (!isOk(porId)) return null
      eventId = porId.value.id
    }
    if (ref.eventSlug !== undefined) {
      const porSlug = await getEventFor(deps)(actor, ref.eventSlug, opciones)
      if (!isOk(porSlug)) return null
      // Con las dos referencias, tienen que ser **el mismo** evento: si no, la acción
      // comprobaría uno y escribiría en el otro.
      if (eventId !== null && eventId !== porSlug.value.id) return null
      eventId = porSlug.value.id
    }
    // Sin ninguna referencia no hay nada que comprobar, y eso es un error de quien llama:
    // la guardia existe justo para las acciones que sí tocan un evento.
    return eventId
  }

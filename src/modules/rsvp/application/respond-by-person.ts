import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { acceptsResponses, type Event, type EventError } from '@/modules/events'
import type { GuestError, GuestGroup, GuestPerson } from '@/modules/guests'
import { rsvpError, type RsvpError } from '../domain/errors'
import { createRsvpResponse, type RsvpResponse } from '../domain/rsvp-response'
import type { RsvpRepository } from './ports'

/**
 * La confirmación **nombre por nombre** de un grupo.
 *
 * Un enlace por familia y una sola respuesta: quien lo abre dice quién de los suyos viene y
 * quién no, y con eso el salón sienta a los que van, el catering cuenta sus restricciones y
 * la puerta sabe a quién espera. Antes solo se guardaba «vienen 5 de 8», que no dice cuáles
 * cinco.
 *
 * **Las personas se buscan por su grupo, nunca por lo que venga en el formulario.** Quien
 * manda el POST elige los identificadores; si se aceptaran tal cual, con un enlace en la mano
 * se podría marcar a gente de otra boda.
 *
 * **Se responde una sola vez**, como en `respondToInvitation`: el enlace circula por el chat
 * de toda la familia. Corregir lo reabre quien organiza, desde el panel.
 */
export const respondByPerson =
  (deps: {
    resolveGroup: (token: string) => Promise<Result<GuestGroup, GuestError>>
    findEventById: (id: string) => Promise<Result<Event, EventError>>
    peopleOf: (guestGroupId: string) => Promise<GuestPerson[]>
    setAttendance: (personId: string, attending: 'yes' | 'no') => Promise<void>
    rsvp: RsvpRepository
    ids: () => string
    clock: () => Date
  }) =>
  async (input: {
    token: string
    /** Quiénes vienen, por identificador de persona. Los demás del grupo quedan en «no». */
    vienen: readonly string[]
    /**
     * «Vienen todos», el atajo de la pareja: quiénes son los resuelve el servidor con las
     * personas del grupo, así que el formulario no manda ni un identificador.
     */
    todos?: boolean
    /** Acompañantes sin nombre cargado, hasta llenar los cupos del grupo. */
    extra: number
    responderName: string | null
    message: string | null
  }): Promise<Result<RsvpResponse, RsvpError>> =>
    attempt<RsvpResponse, RsvpError>(
      async () => {
        const group = await deps.resolveGroup(input.token)
        if (isErr(group)) {
          return err(
            group.error.kind === 'revoked'
              ? rsvpError('invitation_revoked', group.error.detail)
              : rsvpError('invitation_not_found', group.error.detail),
          )
        }

        const event = await deps.findEventById(group.value.eventId)
        if (isErr(event)) return err(rsvpError('storage_failure', event.error.detail))

        const now = deps.clock()
        const hoy = now.toISOString().slice(0, 10)
        if (!acceptsResponses(event.value, hoy)) {
          return err(rsvpError('rsvp_closed', `Evento ${event.value.slug} cerrado el ${event.value.rsvpDeadline}`))
        }

        const anterior = await deps.rsvp.latestFor(group.value.id)
        const reabierto = anterior === null ? null : await deps.rsvp.reopenedAtFor(group.value.id)
        // Reabrir vale para **la respuesta siguiente**: si la marca es anterior a lo ya
        // contestado, es de una corrección que ya se usó.
        if (anterior !== null && (reabierto === null || reabierto.getTime() <= anterior.respondedAt.getTime())) {
          return err(rsvpError('already_answered', `El grupo ${group.value.id} ya respondió`))
        }

        const personas = await deps.peopleOf(group.value.id)
        const marcados = input.todos === true ? new Set(personas.map((persona) => persona.id)) : new Set(input.vienen)
        // Solo cuentan las personas de **este** grupo: lo que llegue de fuera se ignora.
        const suyos = personas.filter((persona) => marcados.has(persona.id))
        const extra = Number.isInteger(input.extra) && input.extra > 0 ? input.extra : 0
        const attending = suyos.length + extra

        const response = createRsvpResponse(
          {
            id: deps.ids(),
            guestGroupId: group.value.id,
            attending,
            responderName: input.responderName,
            message: input.message,
            respondedAt: now,
          },
          { seats: group.value.seats },
        )
        if (isErr(response)) return response

        // Primero la respuesta: es lo que cuentan el resumen, las mesas y la puerta. Si algo
        // fallara al marcar a una persona, la confirmación ya está registrada y no se pierde.
        await deps.rsvp.append(response.value)
        for (const persona of personas) {
          await deps.setAttendance(persona.id, marcados.has(persona.id) ? 'yes' : 'no')
        }

        return ok(response.value)
      },
      (cause) => rsvpError('storage_failure', `No se pudo confirmar por persona: ${String(cause)}`),
    )

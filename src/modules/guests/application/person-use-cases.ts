import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { guestError, type GuestError } from '../domain/errors'
import { createPerson, cupoParaCargar, type GuestPerson } from '../domain/person'
import type { GuestGroupRepository, GuestPersonRepository } from './ports'

type Repos = { groups: GuestGroupRepository; people: GuestPersonRepository }

/**
 * Añade una persona a una invitación **de este evento**.
 *
 * El evento viene de la guardia de la acción y la invitación del navegador: se busca por
 * los dos, así que un id copiado de otra boda es `not_found` y no carga a nadie allí.
 */
export const addPerson =
  (deps: Repos & { ids: () => string }) =>
  async (input: {
    eventId: string
    guestGroupId: string
    fullName: string
    isCompanion?: boolean | undefined
    dietaryNote?: string | null | undefined
    vip?: boolean | undefined
    /** Lo que el atelier eligió en el alta. Sin declararlo aquí se perdía en silencio. */
    attending?: string | null | undefined
    email?: string | null | undefined
  }): Promise<Result<GuestPerson, GuestError>> =>
    attempt<GuestPerson, GuestError>(
      async () => {
        const group = await deps.groups.findById(input.eventId, input.guestGroupId)
        if (group === null) return err(guestError('not_found', 'La invitación no existe'))

        const person = createPerson({
          id: deps.ids(),
          guestGroupId: input.guestGroupId,
          fullName: input.fullName,
          isCompanion: input.isCompanion,
          dietaryNote: input.dietaryNote,
          vip: input.vip,
          attending: input.attending,
          email: input.email,
        })
        if (isErr(person)) return person

        await deps.people.insert(person.value)
        const cupo = cupoParaCargar(group.seats, await deps.people.countInGroup(group.id))
        if (cupo !== group.seats) await deps.groups.setSeats(input.eventId, group.id, cupo)
        return ok(person.value)
      },
      (cause) => guestError('storage_failure', `No se pudo añadir a la persona: ${String(cause)}`),
    )

/**
 * Deja en orden la invitación de la que acaba de salir alguien.
 *
 * **Una invitación nunca se queda vacía**: sin nadie dentro no aparece en la lista del
 * panel, pero seguía contando contra el tope del plan, saliendo en el reparto y abriendo
 * su enlace. Si queda gente y salió el principal, el siguiente pasa a principal y, si la
 * invitación se llamaba como quien salió, pasa a llamarse como él. Una invitación con
 * nombre propio —«Familia Rojas»— lo conserva.
 */
const ordenarInvitacion = async (deps: Repos, eventId: string, groupId: string, saliente: GuestPerson): Promise<void> => {
  const quedan = await deps.people.listByGroup(groupId)
  const primera = quedan[0]
  if (primera === undefined) {
    await deps.groups.remove(eventId, groupId)
    return
  }
  if (saliente.isCompanion || quedan.some((p) => !p.isCompanion)) return

  await deps.people.update(eventId, { ...primera, isCompanion: false })
  const group = await deps.groups.findById(eventId, groupId)
  if (group !== null && group.label === saliente.fullName) await deps.groups.setLabel(eventId, groupId, primera.fullName)
}

/**
 * Edita a una persona sin perder lo que ya tenía: el parche lleva solo lo que cambia.
 *
 * Cada campo se copia del actual cuando no viene. Es tedioso a propósito: `createPerson`
 * recibe un objeto literal, así que un campo que se olvide no es un error de tipos —es un
 * `undefined` que se convierte en nulo y borra el dato sin decir nada. Ya pasó con
 * `attending` y volvió a pasar con `email`.
 *
 * Mover a otra invitación cambia de enlace, de cupo y de mesa: el destino tiene que ser del
 * mismo evento, entra como acompañante si allí ya hay alguien, y su cupo crece si hace
 * falta. La invitación de origen se ordena después.
 */
export const updatePerson =
  (deps: Repos) =>
  async (input: {
    eventId: string
    id: string
    fullName?: string | undefined
    isCompanion?: boolean | undefined
    dietaryNote?: string | null | undefined
    vip?: boolean | undefined
    attending?: string | null | undefined
    email?: string | null | undefined
    guestGroupId?: string | undefined
  }): Promise<Result<GuestPerson, GuestError>> =>
    attempt<GuestPerson, GuestError>(
      async () => {
        const actual = await deps.people.findById(input.eventId, input.id)
        if (actual === null) return err(guestError('not_found', 'La persona no existe'))

        const destino = input.guestGroupId ?? actual.guestGroupId
        const seMueve = destino !== actual.guestGroupId
        const grupoDestino = seMueve ? await deps.groups.findById(input.eventId, destino) : null
        if (seMueve && grupoDestino === null) return err(guestError('not_found', 'La invitación de destino no existe'))

        const yaHay = grupoDestino === null ? 0 : await deps.people.countInGroup(destino)
        const person = createPerson({
          id: actual.id,
          guestGroupId: destino,
          fullName: input.fullName ?? actual.fullName,
          isCompanion: seMueve ? yaHay > 0 : (input.isCompanion ?? actual.isCompanion),
          dietaryNote: input.dietaryNote === undefined ? actual.dietaryNote : input.dietaryNote,
          vip: input.vip ?? actual.vip,
          attending: input.attending === undefined ? actual.attending : input.attending,
          email: input.email === undefined ? actual.email : input.email,
        })
        if (isErr(person)) return person

        await deps.people.update(input.eventId, person.value)
        // La invitación se llama como su principal: si él cambia de nombre, ella también.
        // Una con nombre propio —«Familia Rojas»— no se toca.
        if (!seMueve && !person.value.isCompanion && person.value.fullName !== actual.fullName) {
          const suya = await deps.groups.findById(input.eventId, destino)
          if (suya !== null && suya.label === actual.fullName) await deps.groups.setLabel(input.eventId, destino, person.value.fullName)
        }
        if (grupoDestino !== null) {
          const cupo = cupoParaCargar(grupoDestino.seats, yaHay + 1)
          if (cupo !== grupoDestino.seats) await deps.groups.setSeats(input.eventId, destino, cupo)
          await ordenarInvitacion(deps, input.eventId, actual.guestGroupId, actual)
        }
        return ok(person.value)
      },
      (cause) => guestError('storage_failure', `No se pudo editar a la persona: ${String(cause)}`),
    )

/** Quita a una persona de su invitación y la deja en orden: sin nadie, la invitación se va. */
export const removePerson =
  (deps: Repos) =>
  async (input: { eventId: string; id: string }): Promise<Result<null, GuestError>> =>
    attempt<null, GuestError>(
      async () => {
        const actual = await deps.people.findById(input.eventId, input.id)
        if (actual === null) return err(guestError('not_found', 'La persona no existe'))

        await deps.people.remove(input.eventId, input.id)
        await ordenarInvitacion(deps, input.eventId, actual.guestGroupId, actual)
        return ok(null)
      },
      (cause) => guestError('storage_failure', `No se pudo quitar a la persona: ${String(cause)}`),
    )

export const listPeopleByEvent =
  (deps: { people: GuestPersonRepository }) =>
  async (eventId: string): Promise<Result<GuestPerson[], GuestError>> =>
    attempt<GuestPerson[], GuestError>(
      async () => ok(await deps.people.listByEvent(eventId)),
      (cause) => guestError('storage_failure', `No se pudieron leer las personas: ${String(cause)}`),
    )

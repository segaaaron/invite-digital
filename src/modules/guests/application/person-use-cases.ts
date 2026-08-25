import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { guestError, type GuestError } from '../domain/errors'
import { createPerson, fitsInGroup, type GuestPerson } from '../domain/person'
import type { GuestGroupRepository, GuestPersonRepository } from './ports'

type Deps = { groups: GuestGroupRepository; people: GuestPersonRepository; ids: () => string }

/**
 * Añade una persona a un grupo, con el cupo del grupo como tope.
 *
 * El tope se comprueba **aquí**, no en la pantalla: la acción es un extremo HTTP público
 * y el cupo es lo que se le prometió al invitado y lo que la puerta cuenta al escanear.
 */
export const addPerson =
  (deps: Deps) =>
  async (input: {
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
        const group = await deps.groups.findById(input.guestGroupId)
        if (group === null) return err(guestError('not_found', 'El grupo no existe'))

        const cuantas = await deps.people.countInGroup(input.guestGroupId)
        if (!fitsInGroup(group.seats, cuantas)) {
          return err(
            guestError(
              'invalid_seats',
              `El grupo tiene ${group.seats} cupos y ya hay ${cuantas} personas cargadas. Sube el cupo del grupo primero.`,
            ),
          )
        }

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
        return ok(person.value)
      },
      (cause) => guestError('storage_failure', `No se pudo añadir a la persona: ${String(cause)}`),
    )

/** Edita a una persona sin perder lo que ya tenía: el parche lleva solo lo que cambia. */
export const updatePerson =
  (deps: { people: GuestPersonRepository }) =>
  async (input: {
    id: string
    fullName?: string | undefined
    isCompanion?: boolean | undefined
    dietaryNote?: string | null | undefined
    vip?: boolean | undefined
    attending?: string | null | undefined
  }): Promise<Result<GuestPerson, GuestError>> =>
    attempt<GuestPerson, GuestError>(
      async () => {
        const actual = await deps.people.findById(input.id)
        if (actual === null) return err(guestError('not_found', 'La persona no existe'))

        const person = createPerson({
          id: actual.id,
          guestGroupId: actual.guestGroupId,
          fullName: input.fullName ?? actual.fullName,
          isCompanion: input.isCompanion ?? actual.isCompanion,
          dietaryNote: input.dietaryNote === undefined ? actual.dietaryNote : input.dietaryNote,
          vip: input.vip ?? actual.vip,
          attending: input.attending === undefined ? actual.attending : input.attending,
        })
        if (isErr(person)) return person

        await deps.people.update(person.value)
        return ok(person.value)
      },
      (cause) => guestError('storage_failure', `No se pudo editar a la persona: ${String(cause)}`),
    )

export const removePerson =
  (deps: { people: GuestPersonRepository }) =>
  async (id: string): Promise<Result<null, GuestError>> =>
    attempt<null, GuestError>(
      async () => {
        await deps.people.remove(id)
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

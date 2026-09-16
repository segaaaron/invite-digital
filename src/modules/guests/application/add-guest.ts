import { attempt, err, ok, type Result } from '@/shared/result'
import { guestError, type GuestError, type GuestErrorKind } from '../domain/errors'
import type { Attendance } from '../domain/person'
import type { GuestAllowance } from './add-guest-group'

type AltaGrupo = { ok: true; group: { id: string; label: string }; token: string } | { ok: false; message: string }
type AltaPersona = { ok: true } | { ok: false; message: string; kind?: string }

type Deps = {
  addGroup: (input: {
    eventId: string
    label: string
    seats: number
    allowance: GuestAllowance
    currentGroups: number
  }) => Promise<AltaGrupo>
  setPhone: (eventId: string, groupId: string, phone: string) => Promise<void>
  addPerson: (input: {
    eventId: string
    guestGroupId: string
    fullName: string
    isCompanion: boolean
    dietaryNote: string | null
    vip: boolean
    attending: Attendance | null
    email: string | null
  }) => Promise<AltaPersona>
}

export type AddGuestInput = {
  eventId: string
  fullName: string
  /**
   * El nombre de cada acompañante. Es lo único que la pantalla les pide: sin nombre no hay
   * forma de saber a quién sentar dónde ni a quién buscar en la puerta.
   */
  companionNames?: readonly string[] | undefined
  attending: Attendance | null
  dietaryNote: string | null
  phone: string | null
  email: string | null
  vip: boolean
  allowance: GuestAllowance
  currentGroups: number
}

export type AddGuestResult = { readonly groupId: string; readonly companions: number }

/**
 * El alta de invitado: crea **su invitación** —el enlace, que se llama como él y lleva un
 * cupo por persona— y lo carga dentro con sus acompañantes.
 *
 * Todo o nada. El contenedor lo corre en una transacción y la deshace si esto devuelve un
 * error: media familia guardada con un «hecho» deja a alguien fuera el día del evento, y
 * una invitación sin nadie dentro no la ve nadie en el panel.
 *
 * Sumar a alguien a una invitación que ya existe no es un alta: se hace desde la edición
 * de quien la tiene («Añadir acompañante»).
 */
export const addGuest =
  (deps: Deps) =>
  async (input: AddGuestInput): Promise<Result<AddGuestResult, GuestError>> =>
    attempt<AddGuestResult, GuestError>(
      async () => {
        const nombre = input.fullName.trim()
        if (nombre === '') return err(guestError('invalid_label', 'El invitado necesita un nombre.'))

        const acompanantes = (input.companionNames ?? []).map((n) => n.trim()).filter((n) => n !== '')

        const alta = await deps.addGroup({
          eventId: input.eventId,
          label: nombre,
          seats: 1 + acompanantes.length,
          allowance: input.allowance,
          currentGroups: input.currentGroups,
        })
        if (!alta.ok) return err(guestError('plan_limit_reached', alta.message))
        const groupId = alta.group.id

        const cargar = [
          { fullName: nombre, isCompanion: false, dietaryNote: input.dietaryNote, vip: input.vip, email: input.email },
          ...acompanantes.map((fullName) => ({ fullName, isCompanion: true, dietaryNote: null, vip: false, email: null })),
        ]
        for (const persona of cargar) {
          const hecho = await deps.addPerson({ ...persona, eventId: input.eventId, guestGroupId: groupId, attending: input.attending })
          // La clase del error viene de quien lo produjo: un nombre demasiado largo no es
          // un problema de cupos.
          if (!hecho.ok) return err(guestError((hecho.kind ?? 'invalid_label') as GuestErrorKind, hecho.message))
        }

        if (input.phone !== null && input.phone.trim() !== '') await deps.setPhone(input.eventId, groupId, input.phone.trim())

        return ok({ groupId, companions: acompanantes.length })
      },
      (cause) => guestError('storage_failure', `No se pudo crear el invitado: ${String(cause)}`),
    )

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
  findGroup: (id: string) => Promise<{ id: string; eventId: string } | null>
  /** Deshace el grupo recién creado cuando la persona que lo motivaba no entra. */
  removeGroup: (id: string) => Promise<void>
  setPhone: (groupId: string, phone: string | null) => Promise<void>
  addPerson: (input: {
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
  /** El grupo donde entra. Excluyente con `newGroupLabel`. */
  groupId?: string | undefined
  /** Nombre del grupo nuevo, si el invitado no va en ninguno de los que ya existen. */
  newGroupLabel?: string | undefined
  fullName: string
  companions: number
  /**
   * El nombre de cada acompañante, cuando se conoce.
   *
   * Es lo único que la pantalla les pide. Sin nombre la lista sale llena de «Acompañante
   * de Ana Lucía Vega» y no hay forma de saber a quién sentar dónde ni a quién buscar en la
   * puerta; con él, cada acompañante es una persona como las demás.
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

export type AddGuestResult = {
  readonly groupId: string
  readonly token: string | null
  /** Acompañantes que **entraron**. Puede ser menos de los pedidos si se acabó el cupo. */
  readonly companions: number
  readonly requestedCompanions: number
}

/**
 * El alta de invitado de la maqueta, entera: nombre, grupo —uno que ya exista o uno
 * nuevo—, acompañantes, RSVP, restricción, teléfono, correo y VIP.
 *
 * Es una sola pantalla en el diseño y aquí toca dos tablas: el grupo, que es el dueño del
 * enlace y de los cupos, y las personas que van dentro. El grupo nuevo nace con los cupos
 * que hacen falta —la persona más sus acompañantes—, porque un grupo con menos cupos que
 * gente deja a alguien fuera el día del evento.
 *
 * **Si el grupo no se puede crear, no se crea ninguna persona.** Media alta guardada es
 * peor que ninguna: el atelier no sabría qué parte quedó.
 */
export const addGuest =
  (deps: Deps) =>
  async (input: AddGuestInput): Promise<Result<AddGuestResult, GuestError>> =>
    attempt<AddGuestResult, GuestError>(
      async () => {
        const nombre = input.fullName.trim()
        if (nombre === '') return err(guestError('invalid_label', 'El invitado necesita un nombre.'))

        // `Number('abc')` es NaN, y `1 + NaN` cupos llegaba al dominio: el atelier leía
        // «Cupos inválidos: NaN» ante un campo con basura.
        const nombresDeAcompanantes = (input.companionNames ?? []).map((n) => n.trim()).filter((n) => n !== '')
        const pedidos = Number.isFinite(input.companions) ? Math.max(0, Math.trunc(input.companions)) : 0
        // Los nombres mandan sobre el número: la pantalla pide uno por acompañante.
        const acompanantes = nombresDeAcompanantes.length > 0 ? nombresDeAcompanantes.length : pedidos
        let groupId = input.groupId ?? null
        let token: string | null = null

        if (groupId === null) {
          // Sin nombre de grupo, la invitación se llama como quien la recibe. El caso normal
          // es una persona con su propia invitación, y obligarle a inventar una etiqueta para
          // él solo es lo que empujaba a meterlo dentro del grupo de otro.
          const etiqueta = input.newGroupLabel?.trim() || nombre

          const alta = await deps.addGroup({
            eventId: input.eventId,
            label: etiqueta,
            seats: 1 + acompanantes,
            allowance: input.allowance,
            currentGroups: input.currentGroups,
          })
          if (!alta.ok) return err(guestError('plan_limit_reached', alta.message))

          groupId = alta.group.id
          token = alta.token
        } else {
          // La acción es un extremo HTTP público: un id copiado de otra boda no puede
          // sentar a nadie aquí. El resto de acciones del salón ya lo comprueban.
          const grupo = await deps.findGroup(groupId)
          if (grupo === null || grupo.eventId !== input.eventId) {
            return err(guestError('not_found', 'Ese grupo ya no existe.'))
          }
        }

        const grupoNuevo = token !== null

        const principal = await deps.addPerson({
          guestGroupId: groupId,
          fullName: nombre,
          isCompanion: false,
          dietaryNote: input.dietaryNote,
          vip: input.vip,
          attending: input.attending,
          email: input.email,
        })
        if (!principal.ok) {
          // El grupo se creó para meter a esta persona. Si no entra, se deshace: dejarlo
          // vacío quema un hueco del plan y acuña un token que nadie va a ver, y el
          // atelier solo vería «error» sin saber que hay algo que borrar.
          if (grupoNuevo) await deps.removeGroup(groupId)
          // La clase del error viene de quien lo produjo: un nombre demasiado largo no es
          // un problema de cupos, y decirle al atelier que suba el cupo no arregla nada.
          return err(guestError((principal.kind ?? 'invalid_seats') as GuestErrorKind, principal.message))
        }

        // Los acompañantes se cargan uno a uno y **sin tumbar el alta** si alguno no cabe:
        // la persona principal ya está dentro, y quitarla porque el cuarto acompañante no
        // entra sería castigar lo que sí se pudo hacer.
        let entraron = 0
        for (let i = 0; i < acompanantes; i += 1) {
          const acompanante = await deps.addPerson({
            guestGroupId: groupId,
            fullName: nombresDeAcompanantes[i] ?? `Acompañante de ${nombre}`,
            isCompanion: true,
            dietaryNote: null,
            vip: false,
            attending: input.attending,
            email: null,
          })
          if (!acompanante.ok) break
          entraron += 1
        }

        if (input.phone !== null && input.phone.trim() !== '') await deps.setPhone(groupId, input.phone.trim())

        return ok({ groupId, token, companions: entraron, requestedCompanions: acompanantes })
      },
      (cause) => guestError('storage_failure', `No se pudo crear el invitado: ${String(cause)}`),
    )

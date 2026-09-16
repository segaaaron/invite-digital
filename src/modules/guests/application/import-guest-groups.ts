import { isErr, ok, attempt, type Result } from '@/shared/result'
import type { Minter } from '@/shared/security/tokens'
import { guestError, type GuestError } from '../domain/errors'
import { parseGuestCsv } from '../domain/csv-import'
import { addGuestGroup, type GuestAllowance } from './add-guest-group'
import { createPerson } from '../domain/person'
import type { GuestGroupRepository, GuestPersonRepository } from './ports'

export type ImportedRow = {
  readonly line: number
  readonly label: string
  readonly seats: number
  /** El enlace, una sola vez. `null` si la fila no se creó. */
  readonly token: string | null
  /** Por qué no se creó. `null` si entró. */
  readonly problem: string | null
}

export type ImportReport = {
  readonly rows: readonly ImportedRow[]
  readonly created: number
  readonly rejected: number
}

/**
 * Crea de golpe los grupos de un CSV y devuelve **fila por fila** qué pasó con cada una.
 *
 * Si el plan admite cuarenta y el archivo trae cincuenta, las cuarenta primeras quedan
 * creadas y las diez últimas se rechazan con su motivo: deshacerlo todo por culpa de la
 * fila cuarenta y uno obligaría a repetir el trabajo entero. Un fallo de la base, en
 * cambio, devuelve error y el contenedor deshace la transacción entera.
 */
export const importGuestGroups =
  (deps: { groups: GuestGroupRepository; people: GuestPersonRepository; minter: Minter; ids: () => string; clock: () => Date }) =>
  async (input: {
    eventId: string
    csv: string
    allowance: GuestAllowance
    currentGroups: number
  }): Promise<Result<ImportReport, GuestError>> =>
    attempt<ImportReport, GuestError>(
      async () => {
        const alta = addGuestGroup(deps)
        const filas = parseGuestCsv(input.csv)
        const resultado: ImportedRow[] = []
        let cuantos = input.currentGroups

        for (const fila of filas) {
          if (fila.problem !== null) {
            resultado.push({ line: fila.line, label: fila.label, seats: fila.seats, token: null, problem: fila.problem })
            continue
          }

          const creado = await alta({
            eventId: input.eventId,
            label: fila.label,
            seats: fila.seats,
            allowance: input.allowance,
            currentGroups: cuantos,
          })

          if (isErr(creado)) {
            resultado.push({
              line: fila.line,
              label: fila.label,
              seats: fila.seats,
              token: null,
              problem: creado.error.detail,
            })
            continue
          }

          // La invitación entra con su invitado dentro, que se llama como la fila: una
          // invitación vacía no aparece en la lista del panel y nadie sabría que existe.
          const principal = createPerson({ id: deps.ids(), guestGroupId: creado.value.group.id, fullName: fila.label })
          if (isErr(principal)) return principal
          await deps.people.insert(principal.value)
          if (fila.phone !== null) await deps.groups.setPhone(input.eventId, creado.value.group.id, fila.phone)
          cuantos += 1
          resultado.push({
            line: fila.line,
            label: fila.label,
            seats: fila.seats,
            token: creado.value.token,
            problem: null,
          })
        }

        return ok({
          rows: resultado,
          created: resultado.filter((f) => f.token !== null).length,
          rejected: resultado.filter((f) => f.token === null).length,
        })
      },
      (cause) => guestError('storage_failure', `No se pudo importar: ${String(cause)}`),
    )

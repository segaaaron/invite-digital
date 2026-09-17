import { attempt, err, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from '../domain/errors'
import type { ArrivalRepository, DoorGroupReader } from './ports'

/**
 * Deshacer no borra: escribe lápida. Queda auditoría de que alguien registró una
 * llegada y se retractó, que es lo que hace falta cuando la pareja pregunta al día
 * siguiente por qué el conteo no cuadra.
 */
export const voidArrival =
  (deps: { arrivals: ArrivalRepository; groups: DoorGroupReader; clock: () => Date }) =>
  async (input: { eventId: string; scanId: string }): Promise<Result<void, CheckinError>> =>
    attempt<void, CheckinError>(
      async () => {
        const row = await deps.arrivals.findByScanId(input.scanId)
        if (!row) return err(checkinError('not_found', `No existe el escaneo ${input.scanId}`))

        // Solo desde su evento, igual que corregir.
        const group = await deps.groups.findGroupById(row.guestGroupId)
        if (group === null || group.eventId !== input.eventId) return err(checkinError('not_found', `No existe el escaneo ${input.scanId}`))

        await deps.arrivals.void(input.scanId, deps.clock())
        return ok(undefined)
      },
      (cause) => checkinError('storage_failure', `No se pudo deshacer la llegada: ${String(cause)}`),
    )

/**
 * Deshacer el ingreso de **una persona**, o de la invitación entera si no tiene nombres: el
 * «Revertir» de las apps de recepción, para quien se registró por error.
 *
 * Un escaneo puede traer a varios de la familia. Se anula ese escaneo y, si traía a más, se
 * vuelve a registrar a los demás **a la misma hora**: deshacer a uno no puede sacar a los otros.
 */
export const deshacerIngreso =
  (deps: { arrivals: ArrivalRepository; groups: DoorGroupReader; clock: () => Date; ids: () => string }) =>
  async (input: { eventId: string; groupId: string; personId: string | null }): Promise<Result<void, CheckinError>> =>
    attempt<void, CheckinError>(
      async () => {
        const group = await deps.groups.findGroupById(input.groupId)
        if (group === null || group.eventId !== input.eventId) return err(checkinError('not_found', `No existe la invitación ${input.groupId}`))

        const vivas = (await deps.arrivals.listByEvent(input.eventId)).filter((r) => r.guestGroupId === input.groupId && r.voidedAt === null)
        const ahora = deps.clock()
        for (const fila of vivas) {
          if (input.personId === null) {
            await deps.arrivals.void(fila.scanId, ahora)
            continue
          }
          if (!fila.personIds?.includes(input.personId)) continue
          await deps.arrivals.void(fila.scanId, ahora)
          const resto = fila.personIds.filter((id) => id !== input.personId)
          if (resto.length > 0) {
            await deps.arrivals.insertIfAbsent({
              scanId: deps.ids(),
              guestGroupId: fila.guestGroupId,
              arrivedCount: resto.length,
              scannedAt: fila.scannedAt,
              voidedAt: null,
              recordedBy: fila.recordedBy ?? null,
              personIds: resto,
            })
          }
        }
        return ok(undefined)
      },
      (cause) => checkinError('storage_failure', `No se pudo deshacer el ingreso: ${String(cause)}`),
    )

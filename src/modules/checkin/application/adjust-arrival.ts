import { attempt, err, ok, type Result } from '@/shared/result'
import { checkinError, type CheckinError } from '../domain/errors'
import type { ArrivalRepository, DoorGroupReader } from './ports'

/**
 * La cantidad se corrige sobre el escaneo, no sobre el grupo: el registro es
 * append-only y la corrección es un dato del escaneo que la produjo.
 */
export const adjustArrival =
  (deps: { arrivals: ArrivalRepository; groups: DoorGroupReader }) =>
  async (input: { eventId: string; scanId: string; arrivedCount: number }): Promise<Result<void, CheckinError>> =>
    attempt<void, CheckinError>(
      async () => {
        const row = await deps.arrivals.findByScanId(input.scanId)
        if (!row) return err(checkinError('not_found', `No existe el escaneo ${input.scanId}`))

        // Por id del grupo de la llegada, no listando el evento: la llegada ya sabe a
        // qué grupo pertenece y el caso de uso no recibe el evento.
        // Una llegada solo se toca desde su evento: con el `scanId` de otra boda en la mano,
        // un portero no puede corregir llegadas ajenas. Se responde como si no existiera.
        const group = await deps.groups.findGroupById(row.guestGroupId)
        if (group === null || group.eventId !== input.eventId) return err(checkinError('not_found', `No existe el escaneo ${input.scanId}`))
        const seats = group.seats

        if (!Number.isInteger(input.arrivedCount) || input.arrivedCount < 1 || input.arrivedCount > seats) {
          return err(checkinError('invalid_count', `Cantidad inválida: ${input.arrivedCount} sobre ${seats} cupos`))
        }

        await deps.arrivals.adjust(input.scanId, input.arrivedCount)
        return ok(undefined)
      },
      (cause) => checkinError('storage_failure', `No se pudo corregir la llegada: ${String(cause)}`),
    )

import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import type { GuestError, GuestGroup } from '@/modules/guests'
import { registryError, type RegistryError } from '../domain/errors'
import type { RegistryRepository } from './ports'

type Deps = {
  registry: RegistryRepository
  /**
   * El mismo guardián que usa el RSVP (`guests.resolveByToken`). No se reinventa: la
   * regla de qué token vale, y cuándo deja de valer, tiene que vivir en un solo sitio o
   * acabará divergiendo entre las dos escrituras que el invitado puede hacer.
   */
  resolveGroup: (token: string) => Promise<Result<GuestGroup, GuestError>>
}

/**
 * Un token desconocido y uno revocado responden **lo mismo**: `not_found`, que arriba es
 * un 404. Distinguirlos de cara al invitado confirmaría que el token existe, y eso es
 * justo lo que un 403 le regala a quien está probando tokens.
 *
 * El fallo de almacenamiento sí se separa: eso no es un 404, es que la base no responde.
 */
const asRegistryError = (error: GuestError): RegistryError =>
  error.kind === 'storage_failure'
    ? registryError('storage_failure', error.detail)
    : registryError('not_found', error.detail)

/**
 * El regalo que este invitado tiene derecho a tocar. La lectura previa **no decide** la
 * reserva —de eso se encarga el `UPDATE` condicional—, sirve para dos cosas que el UPDATE
 * no puede dar: comprobar que el regalo es de su evento, y distinguir «ya está comprado»
 * de «llegaste tarde» al redactar el mensaje.
 */
const reachableGift = async (deps: Deps, giftId: string, group: GuestGroup): Promise<Result<null, RegistryError>> => {
  const gift = await deps.registry.findGift(giftId)
  if (!gift) return err(registryError('not_found', `No existe el regalo ${giftId}.`))

  // Un enlace válido de una boda no toca la lista de otra.
  if (gift.eventId !== group.eventId) return err(registryError('wrong_event', 'Ese regalo es de otro evento.'))

  if (gift.status === 'purchased') {
    return err(registryError('already_purchased', 'Este regalo ya está comprado.'))
  }

  return ok(null)
}

/**
 * La reserva la decide la base con un `UPDATE ... WHERE id = $1 AND status = 'available'`,
 * y el puerto devuelve un booleano. Dos invitados abriendo la lista a la vez y pulsando
 * el mismo botón es el fallo clásico de una mesa de regalos, y no aparece nunca en
 * desarrollo: solo el día que hay gente real. Comprobar con un `SELECT` y escribir
 * después deja una ventana entre las dos consultas por la que caben las dos reservas.
 */
export const claimGift =
  (deps: Deps) =>
  async (input: { token: string; giftId: string }): Promise<Result<void, RegistryError>> =>
    attempt<void, RegistryError>(
      async () => {
        const group = await deps.resolveGroup(input.token)
        if (isErr(group)) return err(asRegistryError(group.error))

        const reachable = await reachableGift(deps, input.giftId, group.value)
        if (isErr(reachable)) return reachable

        const won = await deps.registry.claimIfAvailable(input.giftId, group.value.id)
        if (!won) return err(registryError('already_claimed', 'Este regalo ya lo reservó otro invitado.'))

        return ok(undefined)
      },
      (cause) => registryError('storage_failure', `No se pudo reservar el regalo: ${String(cause)}`),
    )

/**
 * Liberar exige además ser quien reservó: el `WHERE` lleva también el grupo. Sin eso,
 * cualquiera con un enlace válido del mismo evento suelta el regalo de otro y se lo
 * queda.
 */
export const releaseGift =
  (deps: Deps) =>
  async (input: { token: string; giftId: string }): Promise<Result<void, RegistryError>> =>
    attempt<void, RegistryError>(
      async () => {
        const group = await deps.resolveGroup(input.token)
        if (isErr(group)) return err(asRegistryError(group.error))

        const reachable = await reachableGift(deps, input.giftId, group.value)
        if (isErr(reachable)) return reachable

        const released = await deps.registry.releaseIfOwner(input.giftId, group.value.id)
        if (!released) return err(registryError('not_yours', 'Ese regalo lo reservó otro invitado.'))

        return ok(undefined)
      },
      (cause) => registryError('storage_failure', `No se pudo soltar el regalo: ${String(cause)}`),
    )

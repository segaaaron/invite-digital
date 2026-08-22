import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { registryError, type RegistryError } from '../domain/errors'
import { createGift, type Gift } from '../domain/gift'
import { transitionGift } from '../domain/gift-status'
import type { RegistryRepository } from './ports'

type Deps = { registry: RegistryRepository }
type WithIds = Deps & { ids: () => string }
type WithClock = Deps & { clock: () => Date }

export type GiftInput = {
  eventId: string
  name: string
  priceCents: number
  store: string | null
  url: string | null
}

export type UpdateGiftInput = GiftInput & { id: string }

/**
 * El regalo pedido, ya comprobado contra el evento del que dice ser. La comprobación vive
 * en el servidor: la UI puede mentir, y un id copiado de la lista de otra boda no puede
 * tocar esta.
 */
const ownedGift = async (deps: Deps, id: string, eventId: string): Promise<Result<Gift, RegistryError>> => {
  const current = await deps.registry.findGift(id)
  if (!current) return err(registryError('not_found', `No existe el regalo ${id}.`))
  if (current.eventId !== eventId) return err(registryError('wrong_event', 'Ese regalo es de otro evento.'))
  return ok(current)
}

export const addGift =
  (deps: WithIds) =>
  async (input: GiftInput): Promise<Result<Gift, RegistryError>> =>
    attempt<Gift, RegistryError>(
      async () => {
        const gift = createGift({ id: deps.ids(), ...input })
        if (isErr(gift)) return gift

        await deps.registry.insertGift(gift.value)
        return ok(gift.value)
      },
      (cause) => registryError('storage_failure', `No se pudo crear el regalo: ${String(cause)}`),
    )

/**
 * Editar los datos del regalo no toca su estado ni su reserva: subir el precio porque en
 * la tienda cambió no puede soltarle la cafetera a quien ya la había apartado.
 */
export const updateGift =
  (deps: Deps) =>
  async (input: UpdateGiftInput): Promise<Result<Gift, RegistryError>> =>
    attempt<Gift, RegistryError>(
      async () => {
        const current = await ownedGift(deps, input.id, input.eventId)
        if (isErr(current)) return current

        const draft = createGift({
          id: current.value.id,
          eventId: current.value.eventId,
          name: input.name,
          priceCents: input.priceCents,
          store: input.store,
          url: input.url,
        })
        if (isErr(draft)) return draft

        const gift: Gift = {
          ...draft.value,
          status: current.value.status,
          claimedByGroupId: current.value.claimedByGroupId,
          claimedAt: current.value.claimedAt,
        }

        await deps.registry.updateGift(gift)
        return ok(gift)
      },
      (cause) => registryError('storage_failure', `No se pudo editar el regalo: ${String(cause)}`),
    )

export const removeGift =
  (deps: Deps) =>
  async (input: { id: string; eventId: string }): Promise<Result<void, RegistryError>> =>
    attempt<void, RegistryError>(
      async () => {
        const current = await ownedGift(deps, input.id, input.eventId)
        if (isErr(current)) return current

        await deps.registry.deleteGift(input.id)
        return ok(undefined)
      },
      (cause) => registryError('storage_failure', `No se pudo borrar el regalo: ${String(cause)}`),
    )

/** Comprado es definitivo: la propia transición se encarga de que no vuelva atrás. */
export const markPurchased =
  (deps: WithClock) =>
  async (input: { id: string; eventId: string }): Promise<Result<Gift, RegistryError>> =>
    attempt<Gift, RegistryError>(
      async () => {
        const current = await ownedGift(deps, input.id, input.eventId)
        if (isErr(current)) return current

        const next = transitionGift(current.value, 'purchased', { kind: 'atelier' }, deps.clock())
        if (isErr(next)) return next

        await deps.registry.updateGift(next.value)
        return ok(next.value)
      },
      (cause) => registryError('storage_failure', `No se pudo marcar el regalo como comprado: ${String(cause)}`),
    )

/**
 * El atelier suelta la reserva de cualquiera. Hace falta porque el invitado que reservó
 * puede haberse quedado sin el enlace, o haber avisado por WhatsApp de que al final no
 * lo trae. La escritura pasa por `updateGift` y no por el `UPDATE` condicional: aquí no
 * hay carrera que ganar, el atelier manda.
 */
export const releaseGiftAsAtelier =
  (deps: WithClock) =>
  async (input: { id: string; eventId: string }): Promise<Result<Gift, RegistryError>> =>
    attempt<Gift, RegistryError>(
      async () => {
        const current = await ownedGift(deps, input.id, input.eventId)
        if (isErr(current)) return current

        const next = transitionGift(current.value, 'available', { kind: 'atelier' }, deps.clock())
        if (isErr(next)) return next

        await deps.registry.updateGift(next.value)
        return ok(next.value)
      },
      (cause) => registryError('storage_failure', `No se pudo liberar el regalo: ${String(cause)}`),
    )

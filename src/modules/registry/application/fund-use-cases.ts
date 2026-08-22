import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { registryError, type RegistryError } from '../domain/errors'
import {
  type Contribution,
  type ContributionMethod,
  createContribution,
  createFund,
  type Fund,
} from '../domain/fund'
import type { RegistryRepository } from './ports'

type Deps = { registry: RegistryRepository }
type WithIds = Deps & { ids: () => string }

export type FundInput = { eventId: string; name: string; description: string | null; goalCents: number }
export type UpdateFundInput = FundInput & { id: string }

export type ContributionInput = {
  eventId: string
  fundId: string
  guestGroupId: string | null
  displayName: string
  amountCents: number
  method: ContributionMethod
  message: string | null
}

const ownedFund = async (deps: Deps, id: string, eventId: string): Promise<Result<Fund, RegistryError>> => {
  const current = await deps.registry.findFund(id)
  if (!current) return err(registryError('not_found', `No existe el fondo ${id}.`))
  if (current.eventId !== eventId) return err(registryError('wrong_event', 'Ese fondo es de otro evento.'))
  return ok(current)
}

export const addFund =
  (deps: WithIds) =>
  async (input: FundInput): Promise<Result<Fund, RegistryError>> =>
    attempt<Fund, RegistryError>(
      async () => {
        const fund = createFund({ id: deps.ids(), ...input })
        if (isErr(fund)) return fund

        await deps.registry.insertFund(fund.value)
        return ok(fund.value)
      },
      (cause) => registryError('storage_failure', `No se pudo abrir el fondo: ${String(cause)}`),
    )

export const updateFund =
  (deps: Deps) =>
  async (input: UpdateFundInput): Promise<Result<Fund, RegistryError>> =>
    attempt<Fund, RegistryError>(
      async () => {
        const current = await ownedFund(deps, input.id, input.eventId)
        if (isErr(current)) return current

        const fund = createFund({
          id: current.value.id,
          eventId: current.value.eventId,
          name: input.name,
          description: input.description,
          goalCents: input.goalCents,
        })
        if (isErr(fund)) return fund

        await deps.registry.updateFund(fund.value)
        return ok(fund.value)
      },
      (cause) => registryError('storage_failure', `No se pudo editar el fondo: ${String(cause)}`),
    )

/**
 * Devuelve cuántas aportaciones se lleva por delante. El borrado en cascada es correcto
 * —una contribución sin fondo no significa nada—, pero el atelier tiene que poder ver el
 * número antes de confirmar, no descubrirlo después.
 */
export const removeFund =
  (deps: Deps) =>
  async (input: { id: string; eventId: string }): Promise<Result<{ contributions: number }, RegistryError>> =>
    attempt<{ contributions: number }, RegistryError>(
      async () => {
        const current = await ownedFund(deps, input.id, input.eventId)
        if (isErr(current)) return current

        const contributions = await deps.registry.listContributions(input.id)
        await deps.registry.deleteFund(input.id)
        return ok({ contributions: contributions.length })
      },
      (cause) => registryError('storage_failure', `No se pudo borrar el fondo: ${String(cause)}`),
    )

/**
 * No hay pasarela de pago: lo que llegó por transferencia o en un sobre lo registra el
 * atelier a mano. Cuando exista pasarela, este es el caso de uso que la llamará.
 */
export const recordContribution =
  (deps: WithIds & { clock: () => Date }) =>
  async (input: ContributionInput): Promise<Result<Contribution, RegistryError>> =>
    attempt<Contribution, RegistryError>(
      async () => {
        const fund = await ownedFund(deps, input.fundId, input.eventId)
        if (isErr(fund)) return fund

        const contribution = createContribution({
          id: deps.ids(),
          fundId: fund.value.id,
          guestGroupId: input.guestGroupId,
          displayName: input.displayName,
          amountCents: input.amountCents,
          method: input.method,
          message: input.message,
          createdAt: deps.clock(),
        })
        if (isErr(contribution)) return contribution

        await deps.registry.insertContribution(contribution.value)
        return ok(contribution.value)
      },
      (cause) => registryError('storage_failure', `No se pudo registrar la aportación: ${String(cause)}`),
    )

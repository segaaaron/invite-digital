import { attempt, ok, type Result } from '@/shared/result'
import { registryError, type RegistryError } from '../domain/errors'
import type { Contribution, Fund } from '../domain/fund'
import { type FundProgress, progressOf } from '../domain/fund-progress'
import type { GiftStatus } from '../domain/gift'
import type { GiftRow, RegistryRepository } from './ports'

export type FundView = {
  readonly fund: Fund
  readonly progress: FundProgress
  readonly contributions: readonly Contribution[]
}

/** Cuántos regalos hay en cada estado, más el total. */
export type GiftTally = { readonly [K in GiftStatus]: number } & { readonly total: number }

export type RegistryView = {
  readonly gifts: readonly GiftRow[]
  readonly funds: readonly FundView[]
  readonly tally: GiftTally
}

/**
 * Todo lo que la lista necesita en una lectura: los regalos con quién los reservó, y los
 * fondos con su progreso **ya calculado**. Que el porcentaje se calcule aquí y no en la
 * pantalla es lo que impide que la vista del panel y la del invitado acaben con dos
 * versiones distintas de la misma barra.
 */
export const listRegistry =
  (deps: { registry: RegistryRepository }) =>
  async (eventId: string): Promise<Result<RegistryView, RegistryError>> =>
    attempt<RegistryView, RegistryError>(
      async () => {
        const [gifts, funds] = await Promise.all([deps.registry.listGifts(eventId), deps.registry.listFunds(eventId)])

        const views: FundView[] = await Promise.all(
          funds.map(async (fund) => {
            const contributions = await deps.registry.listContributions(fund.id)
            return { fund, progress: progressOf(fund, contributions), contributions }
          }),
        )

        const count = (status: GiftStatus) => gifts.filter((g) => g.status === status).length

        return ok({
          gifts,
          funds: views,
          tally: {
            total: gifts.length,
            available: count('available'),
            reserved: count('reserved'),
            purchased: count('purchased'),
          },
        })
      },
      (cause) => registryError('storage_failure', `No se pudo leer la mesa de regalos: ${String(cause)}`),
    )

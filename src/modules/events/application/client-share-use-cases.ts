import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import type { Minter } from '@/shared/security/tokens'
import { DEFAULT_SHARE_DAYS, isShareUsable, shareExpiry } from '../domain/client-share'
import type { Event } from '../domain/event'
import { eventError, type EventError } from '../domain/errors'
import { createEvent } from '../domain/event'
import type { ClientShareRepository, EventRepository } from './ports'

export type CreatedShare = { readonly token: string; readonly expiresAt: Date }

export const createClientShare =
  (deps: { shares: ClientShareRepository; minter: Minter; ids: () => string; clock: () => Date }) =>
  async (input: { eventId: string; days?: number }): Promise<Result<CreatedShare, EventError>> =>
    attempt<CreatedShare, EventError>(
      async () => {
        const { token, hash } = deps.minter.mint()
        const expiresAt = shareExpiry(deps.clock(), input.days ?? DEFAULT_SHARE_DAYS)
        await deps.shares.insert({ id: deps.ids(), eventId: input.eventId, tokenHash: hash, expiresAt })
        return ok({ token, expiresAt })
      },
      (cause) => eventError('storage_failure', `No se pudo crear el enlace del cliente: ${String(cause)}`),
    )

export const revokeClientShare =
  (deps: { shares: ClientShareRepository; clock: () => Date }) =>
  async (shareId: string): Promise<Result<null, EventError>> =>
    attempt<null, EventError>(
      async () => {
        await deps.shares.revoke(shareId, deps.clock())
        return ok(null)
      },
      (cause) => eventError('storage_failure', `No se pudo revocar el enlace: ${String(cause)}`),
    )

export const getLiveClientShare =
  (deps: { shares: ClientShareRepository; clock: () => Date }) =>
  async (eventId: string): Promise<Result<{ id: string; expiresAt: Date } | null, EventError>> =>
    attempt<{ id: string; expiresAt: Date } | null, EventError>(
      async () => {
        const row = await deps.shares.findLiveByEvent(eventId, deps.clock())
        return ok(row === null ? null : { id: row.id, expiresAt: row.expiresAt })
      },
      (cause) => eventError('storage_failure', `No se pudo leer el enlace del cliente: ${String(cause)}`),
    )

/**
 * Resuelve el enlace del cliente. Caducado, revocado o inexistente devuelven todos
 * `not_found`: de cara afuera son lo mismo, y separarlos solo diría al que prueba que
 * el token existió.
 */
export const resolveClientShare =
  (deps: { shares: ClientShareRepository; events: EventRepository; minter: Minter; clock: () => Date }) =>
  async (token: string): Promise<Result<Event, EventError>> =>
    attempt<Event, EventError>(
      async () => {
        const share = await deps.shares.findByTokenHash(deps.minter.hashOf(token))
        if (share === null || !isShareUsable(share, deps.clock())) {
          return err(eventError('not_found', 'Enlace de cliente inexistente, caducado o revocado'))
        }

        const row = await deps.events.findById(share.eventId)
        if (row === null) return err(eventError('not_found', `El enlace apunta a un evento que ya no existe`))

        const event = createEvent(row)
        if (isErr(event)) return event
        return ok(event.value)
      },
      (cause) => eventError('storage_failure', `No se pudo resolver el enlace: ${String(cause)}`),
    )

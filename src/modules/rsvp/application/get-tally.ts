import { attempt, ok, type Result } from '@/shared/result'
import { rsvpError, type RsvpError } from '../domain/errors'
import { tallyOf, type RsvpTally } from '../domain/tally'
import type { RsvpRepository } from './ports'

export const getTally =
  (deps: { rsvp: RsvpRepository }) =>
  async (eventId: string): Promise<Result<RsvpTally, RsvpError>> =>
    attempt<RsvpTally, RsvpError>(
      async () => ok(tallyOf(await deps.rsvp.tallyRowsFor(eventId))),
      (cause) => rsvpError('storage_failure', `No se pudo contar el evento: ${String(cause)}`),
    )

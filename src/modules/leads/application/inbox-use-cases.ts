import { attempt, err, isErr, ok, type Result } from '@/shared/result'
import { corteDeRetencion, inboxError, mover, parseEstado, type EstadoConsulta, type InboxError } from '../domain/pipeline'
import type { ConsultationInbox, ConsultationRow } from './ports'

type Deps = { inbox: ConsultationInbox }

export const listConsultations = (deps: Deps) => async (): Promise<Result<ConsultationRow[], InboxError>> =>
  attempt(
    async () => ok(await deps.inbox.list()),
    (cause) => inboxError('storage_failure', `No se pudieron leer las consultas: ${String(cause)}`),
  )

export const countNewConsultations = (deps: Deps) => async (): Promise<number | null> => {
  // Es una insignia: si falla, la barra se pinta sin ella.
  try {
    return await deps.inbox.countNew()
  } catch {
    return null
  }
}

/**
 * Mueve una consulta por el embudo.
 *
 * La boda se enlaza **solo al ganarla**: una contactada con boda enlazada diría que hubo
 * venta cuando todavía no la hay.
 */
export const moveConsultation =
  (deps: Deps & { clock: () => Date }) =>
  async (input: { id: string; to: string; note: string; eventId: string }): Promise<Result<ConsultationRow, InboxError>> =>
    attempt(
      async () => {
        const actual = await deps.inbox.find(input.id)
        if (actual === null) return err(inboxError('not_found', `No existe la consulta ${input.id}`))

        const hacia: EstadoConsulta = parseEstado(input.to)
        const decision = mover(actual.status, hacia, input.note)
        if (isErr(decision)) return decision

        const eventId = hacia === 'won' && input.eventId.trim() !== '' ? input.eventId.trim() : null
        const escrita = await deps.inbox.move(input.id, actual.status, { ...decision.value, eventId, at: deps.clock() })
        if (!escrita) return err(inboxError('conflict', 'Alguien cambió esta consulta mientras la mirabas. Recarga la página.'))

        return ok(actual)
      },
      (cause) => inboxError('storage_failure', `No se pudo mover la consulta: ${String(cause)}`),
    )

/** La retención de las consultas. La corre `pnpm maintenance` cada 24 horas. */
export const anonymizeExpiredConsultations =
  (deps: Deps & { clock: () => Date }) =>
  async (): Promise<Result<number, InboxError>> =>
    attempt(
      async () => ok(await deps.inbox.anonymizeBefore(corteDeRetencion(deps.clock()))),
      (cause) => inboxError('storage_failure', `No se pudieron anonimizar las consultas: ${String(cause)}`),
    )

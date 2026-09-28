import type { Actor } from '@/modules/identity'
import { attempt, err, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from '../domain/errors'
import { normalizarCodigo, nuevoCodigoDeReferido } from '../domain/referidos'
import type { AdminRepository, ClientNotes, NotaDeCliente, Referidos } from './ports'

/** Las etiquetas que se ofrecen de un toque. Se puede escribir cualquier otra. */
export const ETIQUETAS_SUGERIDAS = ['VIP', 'Recomendado', 'Presupuesto alto', 'Repite', 'Urgente', 'Pide factura'] as const
const MAX_ETIQUETAS = 8
const MAX_ETIQUETA = 24
const MAX_NOTA = 2000

/** La nota más reciente de las guardadas bajo sus claves (una persona puede tener dos si su grupo se unió). */
export const readClientNote =
  (deps: { notes: ClientNotes }) =>
  async (claves: readonly string[]): Promise<Result<NotaDeCliente | null, AdminError>> =>
    attempt(
      async () => ok((await deps.notes.leer(claves)).toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null),
      (cause) => adminError('storage_failure', `No se pudo leer la nota: ${String(cause)}`),
    )

/** Guarda la nota y las etiquetas bajo la primera clave del cliente, recortadas y sin repetir. */
export const saveClientNote =
  (deps: { notes: ClientNotes; admin: AdminRepository }) =>
  async (actor: Actor, input: { clave: string; nombre: string; note: string; tags: readonly string[] }): Promise<Result<null, AdminError>> => {
    if (!/^[et]:.+/.test(input.clave)) return err(adminError('invalid_input', 'No sabemos de quién es esta nota.'))
    const tags = [...new Set(input.tags.map((t) => t.trim().slice(0, MAX_ETIQUETA)).filter((t) => t !== ''))].slice(0, MAX_ETIQUETAS)
    const note = input.note.trim().slice(0, MAX_NOTA)
    return attempt(
      async () => {
        await deps.notes.guardar(input.clave, note === '' ? null : note, tags)
        await deps.admin.record({ actorUserId: actor.userId, actorEmail: actor.email, action: 'cliente.nota', subject: input.nombre })
        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudo guardar la nota: ${String(cause)}`),
    )
  }

/** El código de referido de un evento: el suyo, o uno nuevo si no tenía. */
export const ensureReferralCode =
  (deps: { referidos: Referidos }) =>
  async (eventId: string): Promise<Result<string, AdminError>> =>
    attempt(
      async () => ok(await deps.referidos.crear(eventId, nuevoCodigoDeReferido())),
      (cause) => adminError('storage_failure', `No se pudo crear el código: ${String(cause)}`),
    )

/** Si un código tecleado es un referido que existe. `null` si no casa con la forma o no existe. */
export const validReferralCode =
  (deps: { referidos: Referidos }) =>
  async (crudo: string): Promise<string | null> => {
    const codigo = normalizarCodigo(crudo)
    if (codigo === null) return null
    return (await deps.referidos.existe(codigo)) ? codigo : null
  }

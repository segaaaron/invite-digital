import type { Actor } from '@/modules/identity'
import { attempt, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from '../domain/errors'
import { leerMensajes, paraGuardar, type ClaveDeMensaje, type Mensajes } from '../domain/mensajes'
import type { AdminRepository, SettingsRepository } from './ports'

type Deps = { settings: SettingsRepository }

/** Las plantillas de mensajes y la capacidad de la agenda, con lo que falte por defecto. */
export const readMensajes =
  (deps: Deps) =>
  async (): Promise<Result<{ mensajes: Mensajes; capacidad: number; descuentoReferido: number }, AdminError>> =>
    attempt(
      async () => ok(leerMensajes(await deps.settings.readAll())),
      (cause) => adminError('storage_failure', `No se pudieron leer los mensajes: ${String(cause)}`),
    )

export const saveMensajes =
  (deps: Deps & { admin: AdminRepository }) =>
  async (actor: Actor, input: { mensajes: Partial<Record<ClaveDeMensaje, string>>; capacidad: number; descuentoReferido: number }): Promise<Result<null, AdminError>> =>
    attempt(
      async () => {
        await deps.settings.write(paraGuardar(input.mensajes, input.capacidad, input.descuentoReferido))
        await deps.admin.record({ actorUserId: actor.userId, actorEmail: actor.email, action: 'mensajes.editados', subject: 'Mensajes y agenda' })
        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudieron guardar los mensajes: ${String(cause)}`),
    )

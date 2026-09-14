import type { Actor } from '@/modules/identity/domain/access'
import { attempt, err, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from '../domain/errors'
import {
  camposCambiados,
  leerSiteSettings,
  parseSiteSettings,
  SITE_SETTINGS_KEY,
  type SiteSettings,
} from '../domain/site-settings'
import type { AdminRepository, SettingsRepository, SiteVersionRow, SiteVersionStore } from './ports'

type Deps = { settings: SettingsRepository }

/** Un campo que no valida, con su nombre: la pantalla lo marca donde está. */
export type SiteSaveError = AdminError | { kind: 'invalid_field'; campo: string; detail: string }

export const readSiteSettings = (deps: Deps) => async (): Promise<Result<SiteSettings, AdminError>> =>
  attempt(
    async () => ok(parseSiteSettings((await deps.settings.readAll())[SITE_SETTINGS_KEY])),
    (cause) => adminError('storage_failure', `No se pudieron leer los datos de la web: ${String(cause)}`),
  )

/**
 * Guarda «La web». Valida entero, escribe entero y deja **una versión y una entrada de
 * auditoría con los bloques que cambiaron**. Guardar sin cambios no deja rastro: una
 * versión idéntica a la anterior solo ensucia el historial.
 */
export const saveSiteSettings =
  (deps: Deps & { versions: SiteVersionStore; admin: AdminRepository }) =>
  async (actor: Actor, entrada: SiteSettings, accion: 'web.editada' | 'web.restaurada' = 'web.editada'): Promise<Result<SiteSettings, SiteSaveError>> => {
    const limpio = leerSiteSettings(entrada)
    if (!limpio.ok) return err({ kind: 'invalid_field', campo: limpio.error.campo, detail: limpio.error.mensaje })

    return attempt<SiteSettings, SiteSaveError>(
      async () => {
        const anterior = parseSiteSettings((await deps.settings.readAll())[SITE_SETTINGS_KEY])
        const campos = camposCambiados(anterior, limpio.value)
        if (campos.length === 0 && accion === 'web.editada') return ok(limpio.value)

        await deps.settings.write({ [SITE_SETTINGS_KEY]: JSON.stringify(limpio.value) })
        await deps.versions.add({ data: limpio.value, campos, actorEmail: actor.email })
        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: accion,
          subject: 'La web',
          detail: campos.join(', ') || null,
        })
        return ok(limpio.value)
      },
      (cause) => adminError('storage_failure', `No se pudieron guardar los datos de la web: ${String(cause)}`),
    )
  }

export const listSiteVersions =
  (deps: { versions: SiteVersionStore }) =>
  async (limit = 20): Promise<Result<SiteVersionRow[], AdminError>> =>
    attempt(
      async () => ok(await deps.versions.list(limit)),
      (cause) => adminError('storage_failure', `No se pudo leer el historial: ${String(cause)}`),
    )

/** Restaura una foto del historial guardándola otra vez: deja su propia versión. */
export const restoreSiteVersion =
  (deps: Deps & { versions: SiteVersionStore; admin: AdminRepository }) =>
  async (actor: Actor, id: string): Promise<Result<SiteSettings, SiteSaveError>> => {
    const version = await attempt(
      async () => ok(await deps.versions.find(id)),
      (cause) => adminError('storage_failure', `No se pudo leer esa versión: ${String(cause)}`),
    )
    if (!version.ok) return version
    if (version.value === null) return err(adminError('not_found', 'Esa versión ya no existe.'))
    return saveSiteSettings(deps)(actor, parseSiteSettings(JSON.stringify(version.value.data)), 'web.restaurada')
  }

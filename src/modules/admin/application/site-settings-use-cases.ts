import type { Actor } from '@/modules/identity'
import { attempt, err, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from '../domain/errors'
import { camposCambiados, leerSiteSettings, parseSiteSettings, SITE_SETTINGS_KEY, type SiteSettings } from '../domain/site-settings'
import type { SettingsRepository, SiteSettingsStore, SiteVersionRow } from './ports'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type SiteSaveError =
  | AdminError
  /** Un campo que no valida, con su nombre: la pantalla lo marca donde está. */
  | { kind: 'invalid_field'; campo: string; detail: string }
  /** Otro admin guardó después de que se abriera el formulario. No se escribió nada. */
  | { kind: 'conflict'; detail: string; por: string; en: Date }

export const readSiteSettings = (deps: { settings: SettingsRepository }) => async (): Promise<Result<SiteSettings, AdminError>> =>
  attempt(
    async () => ok(parseSiteSettings((await deps.settings.readAll())[SITE_SETTINGS_KEY])),
    (cause) => adminError('storage_failure', `No se pudieron leer los datos de la web: ${String(cause)}`),
  )

type Accion = 'web.editada' | 'web.restaurada'

/**
 * Guarda «La web» sobre la versión `base` que vio quien editaba.
 *
 * Valida entero y deja la escritura al almacén, que guarda valor, versión y auditoría **en
 * una sola transacción** y rechaza si la base ya no es la última. Guardar sin cambios no
 * deja rastro: una versión idéntica a la anterior solo ensucia el historial.
 */
export const saveSiteSettings =
  (deps: { store: SiteSettingsStore }) =>
  async (actor: Actor, entrada: SiteSettings, base: string | null, accion: Accion = 'web.editada'): Promise<Result<SiteSettings, SiteSaveError>> => {
    const limpio = leerSiteSettings(entrada)
    if (!limpio.ok) return err({ kind: 'invalid_field', campo: limpio.error.campo, detail: limpio.error.mensaje })

    return attempt<SiteSettings, SiteSaveError>(
      async () => {
        const { crudo } = await deps.store.current()
        const anterior = parseSiteSettings(crudo)
        const campos = camposCambiados(anterior, limpio.value)
        if (campos.length === 0 && accion === 'web.editada') return ok(limpio.value)

        const hecho = await deps.store.commit({
          base,
          data: limpio.value,
          partida: anterior,
          campos,
          actorUserId: actor.userId,
          actorEmail: actor.email,
          accion,
        })
        if (!hecho.ok) {
          return err({
            kind: 'conflict',
            detail: 'Otro admin cambió La web mientras editabas.',
            por: hecho.ultima.actorEmail,
            en: hecho.ultima.createdAt,
          })
        }
        return ok(limpio.value)
      },
      (cause) => adminError('storage_failure', `No se pudieron guardar los datos de la web: ${String(cause)}`),
    )
  }

export const listSiteVersions =
  (deps: { store: SiteSettingsStore }) =>
  async (limit = 20): Promise<Result<SiteVersionRow[], AdminError>> =>
    attempt(
      async () => ok(await deps.store.list(limit)),
      (cause) => adminError('storage_failure', `No se pudo leer el historial: ${String(cause)}`),
    )

/** Restaura una foto del historial guardándola otra vez: deja su propia versión. */
export const restoreSiteVersion =
  (deps: { store: SiteSettingsStore }) =>
  async (actor: Actor, id: string, base: string | null): Promise<Result<SiteSettings, SiteSaveError>> => {
    // Un identificador que no es un UUID no existe: sin este corte llegaría a Postgres como
    // error de sintaxis y se contaría como avería de la base.
    if (!UUID.test(id)) return err(adminError('not_found', 'Esa versión ya no existe.'))
    const version = await attempt(
      async () => ok(await deps.store.find(id)),
      (cause) => adminError('storage_failure', `No se pudo leer esa versión: ${String(cause)}`),
    )
    if (!version.ok) return version
    if (version.value === null) return err(adminError('not_found', 'Esa versión ya no existe.'))
    return saveSiteSettings(deps)(actor, parseSiteSettings(JSON.stringify(version.value.data)), base, 'web.restaurada')
  }

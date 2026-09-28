import type { Actor } from '@/modules/identity'
import { attempt, err, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from '../domain/errors'
import { camposCambiados, leerSiteSettings, parseSiteSettings, SITE_SETTINGS_KEY, type SiteSettings, type Testimonio } from '../domain/site-settings'
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

/**
 * **Publica una opinión como testimonio** (28 de septiembre): la que el cliente dejó con permiso
 * para publicarla. Entra la primera y confirmada —el permiso es el respaldo—, y se guarda como
 * cualquier cambio de La web: con su versión y su auditoría, sobre la última que hay.
 *
 * La web enseña hasta seis: con seis, hay que quitar uno antes en La web.
 */
export const publishTestimonial =
  (deps: { store: SiteSettingsStore }) =>
  async (actor: Actor, input: { autor: string; rol: string; cita: string }): Promise<Result<SiteSettings, SiteSaveError>> => {
    const actual = await attempt(
      async () => ok(await deps.store.current()),
      (cause) => adminError('storage_failure', `No se pudieron leer los datos de la web: ${String(cause)}`),
    )
    if (!actual.ok) return actual
    const ajustes = parseSiteSettings(actual.value.crudo)
    const cita = input.cita.trim().slice(0, 400)
    if (ajustes.testimonios.some((t) => t.cita.es === cita)) return err(adminError('invalid_input', 'Esa opinión ya está publicada en la web.'))
    if (ajustes.testimonios.length >= 6) return err(adminError('invalid_input', 'La web ya enseña seis testimonios: quita uno en La web antes de sumar este.'))
    const nuevo: Testimonio = { autor: input.autor.trim().slice(0, 80), rol: { es: input.rol, en: '' }, cita: { es: cita, en: '' }, foto: '', confirmado: true }
    return saveSiteSettings(deps)(actor, { ...ajustes, testimonios: [nuevo, ...ajustes.testimonios] }, actual.value.ultimaVersion)
  }

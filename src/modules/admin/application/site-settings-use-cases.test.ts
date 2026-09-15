import { describe, expect, it } from 'vitest'
import type { Actor } from '@/modules/identity'
import { isErr, isOk } from '@/shared/result'
import { DEFAULT_SITE_SETTINGS, SITE_SETTINGS_KEY, type SiteSettings } from '../domain/site-settings'
import type { SettingsRepository, SiteSettingsStore, SiteVersionRow } from './ports'
import { readSiteSettings, restoreSiteVersion, saveSiteSettings } from './site-settings-use-cases'

const actor = { userId: 'u1', email: 'admin@x.bo', role: 'admin' } as Actor

/** Un almacén en memoria que cumple el contrato: compara la base y escribe todo o nada. */
function dobles() {
  let crudo: string | undefined
  const versiones: SiteVersionRow[] = []
  const auditoria: { accion: string; campos: readonly string[] }[] = []
  const nueva = (data: unknown, campos: readonly string[], actorEmail: string) =>
    versiones.unshift({ id: `00000000-0000-4000-8000-${String(versiones.length + 1).padStart(12, '0')}`, createdAt: new Date(), data, campos, actorEmail })
  const store: SiteSettingsStore = {
    current: async () => ({ crudo, ultimaVersion: versiones[0]?.id ?? null }),
    commit: async (e) => {
      if ((versiones[0]?.id ?? null) !== e.base) return { ok: false, ultima: versiones[0]! }
      if (versiones.length === 0) nueva(e.partida, [], 'Valores iniciales')
      crudo = JSON.stringify(e.data)
      nueva(e.data, e.campos, e.actorEmail)
      auditoria.push({ accion: e.accion, campos: e.campos })
      return { ok: true }
    },
    list: async (n) => versiones.slice(0, n),
    find: async (id) => versiones.find((v) => v.id === id) ?? null,
  }
  return { versiones, auditoria, store, crudo: () => crudo }
}

const con = (c: Partial<SiteSettings>): SiteSettings => ({ ...DEFAULT_SITE_SETTINGS, ...c })

describe('site settings', () => {
  it('sin fila guardada lee los valores por defecto', async () => {
    const settings: SettingsRepository = { readAll: async () => ({}), write: async () => {} }
    const r = await readSiteSettings({ settings })()
    expect(isOk(r) && r.value).toEqual(DEFAULT_SITE_SETTINGS)
    expect(SITE_SETTINGS_KEY).toBe('site.settings')
  })

  it('guarda normalizado, deja versión, la partida y anota qué bloques cambiaron', async () => {
    const d = dobles()
    const r = await saveSiteSettings(d)(actor, con({ whatsapp: '700 12345', ciudad: 'La Paz' }), null)
    expect(isOk(r)).toBe(true)
    expect(JSON.parse(d.crudo()!).whatsapp).toBe('+59170012345')
    expect(d.versiones[0]?.campos).toEqual(['ciudad', 'whatsapp'])
    expect(d.versiones[1]).toMatchObject({ data: DEFAULT_SITE_SETTINGS, campos: [] })
    expect(d.auditoria[0]).toEqual({ accion: 'web.editada', campos: ['ciudad', 'whatsapp'] })
  })

  it('guardar sin cambios no deja versión ni auditoría', async () => {
    const d = dobles()
    await saveSiteSettings(d)(actor, DEFAULT_SITE_SETTINGS, null)
    expect(d.versiones).toEqual([])
    expect(d.auditoria).toEqual([])
  })

  it('un campo inválido no escribe nada y dice cuál es', async () => {
    const d = dobles()
    const r = await saveSiteSettings(d)(actor, con({ whatsapp: '12' }), null)
    expect(isErr(r) && r.error.kind === 'invalid_field' && r.error.campo).toBe('whatsapp')
    expect(d.crudo()).toBeUndefined()
    expect(d.versiones).toEqual([])
  })

  it('si otro admin guardó después de abrir el formulario, no escribe y dice quién', async () => {
    const d = dobles()
    await saveSiteSettings(d)(actor, con({ ciudad: 'La Paz' }), null)
    const otro = { ...actor, email: 'otra@x.bo' } as Actor
    await saveSiteSettings(d)(otro, con({ ciudad: 'Sucre' }), d.versiones[0]!.id)

    // El primero sigue editando sobre la versión de «La Paz», que ya no es la última.
    const r = await saveSiteSettings(d)(actor, con({ ciudad: 'Tarija' }), d.versiones[1]!.id)

    expect(isErr(r) && r.error.kind === 'conflict' && r.error.por).toBe('otra@x.bo')
    expect(JSON.parse(d.crudo()!).ciudad).toBe('Sucre')
    expect(d.versiones).toHaveLength(3)
  })

  it('restaurar vuelve a guardar la foto vieja como versión nueva', async () => {
    const d = dobles()
    await saveSiteSettings(d)(actor, con({ ciudad: 'La Paz' }), null)
    await saveSiteSettings(d)(actor, con({ ciudad: 'Sucre' }), d.versiones[0]!.id)
    const laPaz = d.versiones.find((v) => (v.data as SiteSettings).ciudad === 'La Paz')!

    const r = await restoreSiteVersion(d)(actor, laPaz.id, d.versiones[0]!.id)

    expect(isOk(r)).toBe(true)
    expect((d.versiones[0]?.data as SiteSettings).ciudad).toBe('La Paz')
    expect(d.versiones).toHaveLength(4) // partida, La Paz, Sucre y la restauración
    expect(d.auditoria.at(-1)?.accion).toBe('web.restaurada')
  })

  it('un identificador que no es UUID responde «no existe», no avería', async () => {
    const r = await restoreSiteVersion(dobles())(actor, 'abc', null)
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})

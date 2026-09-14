import { describe, expect, it } from 'vitest'
import type { Actor } from '@/modules/identity/domain/access'
import { isErr, isOk } from '@/shared/result'
import { DEFAULT_SITE_SETTINGS, SITE_SETTINGS_KEY, type SiteSettings } from '../domain/site-settings'
import type { AdminRepository, SettingsRepository, SiteVersionRow, SiteVersionStore } from './ports'
import { readSiteSettings, restoreSiteVersion, saveSiteSettings } from './site-settings-use-cases'

const actor = { userId: 'u1', email: 'admin@x.bo', role: 'admin' } as Actor

function dobles(inicial: Record<string, string> = {}) {
  const filas = { ...inicial }
  const versiones: SiteVersionRow[] = []
  const auditoria: { action: string; detail?: string | null }[] = []
  const settings: SettingsRepository = {
    readAll: async () => ({ ...filas }),
    write: async (e) => void Object.assign(filas, e),
  }
  const versions: SiteVersionStore = {
    add: async ({ data, campos, actorEmail }) =>
      void versiones.unshift({ id: `v${versiones.length + 1}`, createdAt: new Date(), data, campos, actorEmail }),
    list: async (n) => versiones.slice(0, n),
    find: async (id) => versiones.find((v) => v.id === id) ?? null,
  }
  const admin = { record: async (e: { action: string; detail?: string | null }) => void auditoria.push(e) } as unknown as AdminRepository
  return { filas, versiones, auditoria, deps: { settings, versions, admin } }
}

const con = (c: Partial<SiteSettings>): SiteSettings => ({ ...DEFAULT_SITE_SETTINGS, ...c })

describe('site settings', () => {
  it('sin fila guardada lee los valores por defecto', async () => {
    const { deps } = dobles()
    const r = await readSiteSettings(deps)()
    expect(isOk(r) && r.value).toEqual(DEFAULT_SITE_SETTINGS)
  })

  it('guarda normalizado, deja versión y anota qué bloques cambiaron', async () => {
    const { deps, filas, versiones, auditoria } = dobles()
    const r = await saveSiteSettings(deps)(actor, con({ whatsapp: '700 12345', ciudad: 'La Paz' }))
    expect(isOk(r)).toBe(true)
    expect(JSON.parse(filas[SITE_SETTINGS_KEY]!).whatsapp).toBe('+59170012345')
    expect(versiones[0]?.campos).toEqual(['ciudad', 'whatsapp'])
    expect(auditoria[0]).toMatchObject({ action: 'web.editada', detail: 'ciudad, whatsapp' })
  })

  it('guardar sin cambios no deja versión ni auditoría', async () => {
    const { deps, versiones, auditoria } = dobles()
    await saveSiteSettings(deps)(actor, DEFAULT_SITE_SETTINGS)
    expect(versiones).toEqual([])
    expect(auditoria).toEqual([])
  })

  it('un campo inválido no escribe nada y dice cuál es', async () => {
    const { deps, filas, versiones } = dobles()
    const r = await saveSiteSettings(deps)(actor, con({ whatsapp: '12' }))
    expect(isErr(r) && r.error.kind === 'invalid_field' && r.error.campo).toBe('whatsapp')
    expect(filas).toEqual({})
    expect(versiones).toEqual([])
  })

  it('restaurar vuelve a guardar la foto vieja como versión nueva', async () => {
    const { deps, versiones, auditoria } = dobles()
    await saveSiteSettings(deps)(actor, con({ ciudad: 'La Paz' }))
    await saveSiteSettings(deps)(actor, con({ ciudad: 'Sucre' }))
    const laPaz = versiones.find((v) => (v.data as SiteSettings).ciudad === 'La Paz')!

    const r = await restoreSiteVersion(deps)(actor, laPaz.id)

    expect(isOk(r)).toBe(true)
    expect((versiones[0]?.data as SiteSettings).ciudad).toBe('La Paz')
    expect(versiones).toHaveLength(3)
    expect(auditoria.at(-1)?.action).toBe('web.restaurada')
  })
})

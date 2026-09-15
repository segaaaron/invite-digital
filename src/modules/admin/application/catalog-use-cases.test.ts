import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { Actor } from '@/modules/identity/domain/access'
import type { PlanCrudo } from '../domain/plan-editable'
import type { AdminRepository, CatalogAdmin, PlanAdminRow } from './ports'
import { savePlan, setTemplatePublished } from './catalog-use-cases'

const actor = { userId: 'u1', email: 'admin@x.bo', role: 'admin' } as Actor
const texto = { name: 'P', tagline: '', description: '', features: 'RSVP' }
const crudo = (isActive: boolean): PlanCrudo => ({
  priceCents: 1000,
  maxGuestGroups: '',
  maxDoorPorters: '0',
  maxGalleryPhotos: '',
  guestPhotos: true,
  eventPassword: true,
  csvImport: true,
  onlineDays: '90',
  designChange: 'siempre',
  includesSeating: true,
  includesRegistry: true,
  includesCheckin: true,
  highlighted: false,
  isActive,
  es: texto,
  en: texto,
})
const fila = (slug: string, isActive: boolean) => ({ slug, isActive, priceCents: 500, currency: 'BOB' }) as PlanAdminRow

function dobles(planes: PlanAdminRow[]) {
  const guardados: string[] = []
  const auditoria: string[] = []
  const catalog: CatalogAdmin = {
    listPlans: async () => planes,
    savePlan: async (slug) => (guardados.push(slug), 'ok' as const),
    publication: async () => ({}),
    setPublished: async (slug) => slug !== 'fantasma',
  }
  const admin = { record: async (e: { action: string }) => void auditoria.push(e.action) } as unknown as AdminRepository
  return { catalog, admin, guardados, auditoria }
}

describe('savePlan', () => {
  it('guarda y deja rastro', async () => {
    const d = dobles([fila('a', true), fila('b', true)])
    expect(isOk(await savePlan(d)(actor, 'a', crudo(false)))).toBe(true)
    expect(d.guardados).toEqual(['a'])
    expect(d.auditoria).toEqual(['plan.editado'])
  })

  it('no retira el último plan activo', async () => {
    const d = dobles([fila('a', true), fila('b', false)])
    const r = await savePlan(d)(actor, 'a', crudo(false))
    expect(isErr(r) && r.error.detail).toContain('único plan activo')
    expect(d.guardados).toEqual([])
  })

  it('un plan que no existe no escribe', async () => {
    const d = dobles([fila('a', true)])
    const r = await savePlan(d)(actor, 'x', crudo(true))
    expect(isErr(r) && r.error.kind).toBe('not_found')
  })
})

describe('setTemplatePublished', () => {
  it('no publica un diseño que el motor no sabe pintar, pero sí deja retirarlo', async () => {
    const d = dobles([])
    const usar = setTemplatePublished({ ...d, conocidos: () => ['boda'] })
    expect(isErr(await usar(actor, 'perla', true))).toBe(true)
    expect(isOk(await usar(actor, 'perla', false))).toBe(true)
    expect(isOk(await usar(actor, 'boda', true))).toBe(true)
    expect(d.auditoria).toEqual(['modelo.retirado', 'modelo.publicado'])
  })
})

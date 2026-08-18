import { describe, expect, it } from 'vitest'
import { drizzlePlanRepository } from './drizzle-plan-repository'
import { drizzleTemplateRepository } from './drizzle-template-repository'

describe('repositorios Drizzle (requiere base sembrada)', () => {
  it('lee los tres planes en español', async () => {
    const rows = await drizzlePlanRepository.listActive('es')
    expect(rows.map((r) => r.slug)).toEqual(['atelier', 'firma-3d', 'alta-costura'])
    expect(rows[0]?.name).toBe('Atelier')
  })

  it('lee los planes en inglés con el mismo precio', async () => {
    const es = await drizzlePlanRepository.listActive('es')
    const en = await drizzlePlanRepository.listActive('en')
    expect(en.map((r) => r.priceCents)).toEqual(es.map((r) => r.priceCents))
    expect(en[1]?.name).toBe('Signature 3D')
  })

  it('lee las ocho plantillas publicadas', async () => {
    const rows = await drizzleTemplateRepository.listPublished('es')
    expect(rows).toHaveLength(8)
    expect(rows[0]?.slug).toBe('perla')
    expect(rows[0]?.categoryName).toBe('Boda')
  })

  it('encuentra una plantilla por slug y devuelve null si no existe', async () => {
    expect(await drizzleTemplateRepository.findBySlug('zafiro', 'es')).not.toBeNull()
    expect(await drizzleTemplateRepository.findBySlug('inexistente', 'es')).toBeNull()
  })
})

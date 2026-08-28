import { eq } from 'drizzle-orm'
import { CATALOG_LISTOS } from '@/shared/design/theme-catalog'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/shared/db/client'
import { eventCategories, planTranslations, plans, templateTranslations, templates } from '@/shared/db/schema'
import { createDrizzlePlanRepository, drizzlePlanRepository } from './drizzle-plan-repository'
import { createDrizzleTemplateRepository, drizzleTemplateRepository } from './drizzle-template-repository'

// Todas las pruebas que insertan datos corren dentro de una transacción que se
// revierte al final (mismo patrón que `src/shared/db/schema.test.ts` para el trigger de
// `updated_at`): así se prueba el comportamiento real de la base sin dejar residuo.
class RollbackForTest extends Error {}

async function runInRolledBackTransaction(run: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await run(tx)
      throw new RollbackForTest()
    })
  } catch (error) {
    if (!(error instanceof RollbackForTest)) throw error
  }
}

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

  it('publica exactamente los diseños portados, y ninguna de las de relleno', async () => {
    // Las ocho de relleno —perla, mármol, laurel…— se despublicaron al entrar la colección.
    // No se borraron: borrarlas rompería cualquier enlace repartido.
    const rows = await drizzleTemplateRepository.listPublished('es')
    expect(rows).toHaveLength(CATALOG_LISTOS.length)
    expect(rows.map((fila) => fila.slug)).not.toContain('perla')
  })

  it('el slug de cada plantilla publicada es la clave de su tema', async () => {
    // Es lo que impide que la web enseñe un modelo y el invitado reciba otro. Si algún día
    // dejan de coincidir, el enlace de la tarjeta apunta a un diseño distinto del dibujado.
    const rows = await drizzleTemplateRepository.listPublished('es')
    const listos = CATALOG_LISTOS.map((entrada) => entrada.key)
    for (const fila of rows) {
      expect(listos, fila.slug).toContain(fila.slug)
    }
  })

  describe('traducción faltante', () => {
    let errorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      errorSpy.mockRestore()
    })

    it('una plantilla con solo traducción en español aparece en es, no en en, y no deja residuo', async () => {
      await runInRolledBackTransaction(async (tx) => {
        const repo = createDrizzleTemplateRepository(tx)

        const [category] = await tx.select({ id: eventCategories.id }).from(eventCategories).where(eq(eventCategories.slug, 'boda'))
        if (!category) throw new Error('No existe la categoría "boda" — ¿corriste `pnpm db:seed`?')

        const beforeEs = await repo.listPublished('es')

        const [inserted] = await tx
          .insert(templates)
          .values({
            slug: 'prueba-solo-es',
            themeKey: 'clasico',
            categoryId: category.id,
            coverImagePath: '/templates/prueba.jpg',
            palette: { base: '#FFFFFF', accent: '#000000' },
            sortOrder: 999,
            isPublished: true,
          })
          .returning({ id: templates.id })
        if (!inserted) throw new Error('No se pudo insertar la plantilla de prueba')

        await tx.insert(templateTranslations).values({
          templateId: inserted.id,
          locale: 'es',
          name: 'Plantilla de prueba',
          description: 'Solo existe en español.',
        })

        const afterEs = await repo.listPublished('es')
        const afterEn = await repo.listPublished('en')

        expect(afterEs).toHaveLength(beforeEs.length + 1)
        expect(afterEs.some((t) => t.slug === 'prueba-solo-es')).toBe(true)
        expect(afterEn.some((t) => t.slug === 'prueba-solo-es')).toBe(false)

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Traducción faltante en "en"'))
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('prueba-solo-es'))
      })

    })

    it('un plan con solo traducción en español aparece en es, no en en, y no deja residuo', async () => {
      await runInRolledBackTransaction(async (tx) => {
        const repo = createDrizzlePlanRepository(tx)

        const beforeEs = await repo.listActive('es')

        const [inserted] = await tx
          .insert(plans)
          .values({
            slug: 'prueba-plan-solo-es',
            priceCents: 1000,
            highlighted: false,
            sortOrder: 999,
            isActive: true,
          })
          .returning({ id: plans.id })
        if (!inserted) throw new Error('No se pudo insertar el plan de prueba')

        await tx.insert(planTranslations).values({
          planId: inserted.id,
          locale: 'es',
          name: 'Plan de prueba',
          tagline: 'Solo español',
          description: 'Solo existe en español.',
          features: ['Una característica'],
        })

        const afterEs = await repo.listActive('es')
        const afterEn = await repo.listActive('en')

        expect(afterEs).toHaveLength(beforeEs.length + 1)
        expect(afterEs.some((p) => p.slug === 'prueba-plan-solo-es')).toBe(true)
        expect(afterEn.some((p) => p.slug === 'prueba-plan-solo-es')).toBe(false)

        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Traducción faltante en "en"'))
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('prueba-plan-solo-es'))
      })

      const after = await drizzlePlanRepository.listActive('es')
      expect(after.some((p) => p.slug === 'prueba-plan-solo-es')).toBe(false)
    })
  })
})

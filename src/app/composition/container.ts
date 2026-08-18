// Raíz de composición: el único lugar donde se conectan los puertos de `application`
// con sus implementaciones de `infrastructure`. Vive en `src/app` (no en `src/shared`)
// porque la configuración de fronteras de ESLint (`eslint.config.mjs`) solo permite que
// el tipo `app` importe de `infrastructure`; `shared` solo puede importar de `shared`.
// Ver el informe de la Task 7 para el detalle de esta decisión.
import { getTemplate } from '@/modules/catalog/application/get-template'
import { listCategories } from '@/modules/catalog/application/list-categories'
import { listPlans } from '@/modules/catalog/application/list-plans'
import { listTemplates } from '@/modules/catalog/application/list-templates'
import { drizzleCategoryRepository } from '@/modules/catalog/infrastructure/drizzle-category-repository'
import { drizzlePlanRepository } from '@/modules/catalog/infrastructure/drizzle-plan-repository'
import { drizzleTemplateRepository } from '@/modules/catalog/infrastructure/drizzle-template-repository'
import { submitConsultation } from '@/modules/leads/application/submit-consultation'
import { drizzleConsultationRepository } from '@/modules/leads/infrastructure/drizzle-consultation-repository'

export const catalog = {
  listPlans: listPlans({ plans: drizzlePlanRepository }),
  listTemplates: listTemplates({ templates: drizzleTemplateRepository }),
  getTemplate: getTemplate({ templates: drizzleTemplateRepository }),
  listCategories: listCategories({ categories: drizzleCategoryRepository }),
} as const

export const leads = {
  submitConsultation: submitConsultation({ requests: drizzleConsultationRepository, clock: () => new Date() }),
} as const

import { isErr, ok, type Result } from '@/shared/result'
import type { Locale } from '@/shared/i18n/locales'
import type { CatalogError } from '../domain/errors'
import { createPlan, type Plan } from '../domain/plan'
import type { PlanRepository } from './ports'

export const listPlans =
  (deps: { plans: PlanRepository }) =>
  async (locale: Locale): Promise<Result<Plan[], CatalogError>> => {
    const rows = await deps.plans.listActive(locale)
    const built: Plan[] = []

    for (const row of rows) {
      const plan = createPlan(row)
      if (isErr(plan)) return plan
      built.push(plan.value)
    }

    built.sort((a, b) => a.sortOrder - b.sortOrder)
    return ok(built)
  }

import { err, isErr, ok, type Result } from '@/shared/result'
import { catalogError, type CatalogError } from './errors'
import { createMoney, type Money } from './money'

export type Plan = {
  readonly id: string
  readonly slug: string
  readonly price: Money
  readonly highlighted: boolean
  readonly sortOrder: number
  readonly name: string
  readonly tagline: string
  readonly description: string
  readonly features: readonly string[]
}

export type PlanInput = {
  id: string
  slug: string
  priceCents: number
  highlighted: boolean
  sortOrder: number
  name: string
  tagline: string
  description: string
  features: readonly string[]
}

export function createPlan(input: PlanInput): Result<Plan, CatalogError> {
  const slug = input.slug.trim()
  if (slug.length === 0) {
    return err(catalogError('invalid_slug', 'El slug del plan no puede estar vacío'))
  }
  if (input.features.length === 0) {
    return err(catalogError('empty_features', `El plan ${slug} no tiene características`))
  }

  const price = createMoney(input.priceCents)
  if (isErr(price)) return price

  return ok({
    id: input.id,
    slug,
    price: price.value,
    highlighted: input.highlighted,
    sortOrder: input.sortOrder,
    name: input.name,
    tagline: input.tagline,
    description: input.description,
    features: [...input.features],
  })
}

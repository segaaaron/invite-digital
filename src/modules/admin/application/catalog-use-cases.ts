import type { Actor } from '@/modules/identity'
import { attempt, err, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from '../domain/errors'
import { leerPlan, type PlanCrudo } from '../domain/plan-editable'
import type { AdminRepository, CatalogAdmin, PlanAdminRow } from './ports'

type Deps = { catalog: CatalogAdmin; admin: AdminRepository }

export const listPlansForAdmin = (deps: { catalog: CatalogAdmin }) => async (): Promise<Result<PlanAdminRow[], AdminError>> =>
  attempt(
    async () => ok(await deps.catalog.listPlans()),
    (cause) => adminError('storage_failure', `No se pudieron leer los planes: ${String(cause)}`),
  )

export const readPublication = (deps: { catalog: CatalogAdmin }) => async (): Promise<Result<Record<string, boolean>, AdminError>> =>
  attempt(
    async () => ok(await deps.catalog.publication()),
    (cause) => adminError('storage_failure', `No se pudo leer qué modelos están publicados: ${String(cause)}`),
  )

/**
 * Guarda un plan.
 *
 * **No se retira el último plan activo.** Un evento sin plan usa el más barato activo, y la
 * página de precios lista los activos: sin ninguno, la web se queda sin precios y cada
 * boda nueva sin capacidades.
 */
export const savePlan =
  (deps: Deps) =>
  async (actor: Actor, slug: string, crudo: PlanCrudo): Promise<Result<null, AdminError>> =>
    attempt(
      async () => {
        const plan = leerPlan(crudo)
        if (!plan.ok) return plan

        const actuales = await deps.catalog.listPlans()
        const actual = actuales.find((p) => p.slug === slug)
        if (actual === undefined) return err(adminError('not_found', `No existe el plan ${slug}`))

        const otrosActivos = actuales.filter((p) => p.isActive && p.slug !== slug).length
        if (!plan.value.isActive && otrosActivos === 0) {
          return err(adminError('invalid_input', 'Es el único plan activo: sin él la web se queda sin precios.'))
        }

        const guardado = await deps.catalog.savePlan(slug, plan.value)
        if (guardado === 'no_existe') return err(adminError('not_found', `No existe el plan ${slug}`))
        if (guardado === 'ultimo_activo') {
          return err(adminError('invalid_input', 'Es el único plan activo: sin él la web se queda sin precios.'))
        }
        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: 'plan.editado',
          subject: slug,
          detail: `${actual.priceCents / 100} → ${plan.value.priceCents / 100} ${actual.currency}${plan.value.isActive ? '' : ' · retirado'}`,
        })
        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudo guardar el plan: ${String(cause)}`),
    )

export const setTemplatePublished =
  (deps: Deps & { conocidos: () => readonly string[] }) =>
  async (actor: Actor, slug: string, published: boolean): Promise<Result<null, AdminError>> =>
    attempt(
      async () => {
        // Solo los diseños que el motor sabe pintar: publicar otra clave vendería un
        // modelo que lleva a un 404, y es lo que `pnpm preflight` corta al desplegar.
        if (published && !deps.conocidos().includes(slug)) {
          return err(adminError('invalid_input', `El diseño ${slug} no está portado: no se puede publicar.`))
        }
        if (!(await deps.catalog.setPublished(slug, published))) {
          return err(adminError('not_found', `No existe el modelo ${slug}`))
        }
        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: published ? 'modelo.publicado' : 'modelo.retirado',
          subject: slug,
        })
        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudo cambiar la publicación: ${String(cause)}`),
    )

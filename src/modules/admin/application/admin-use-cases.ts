import { canDeleteUser, canDemote, type Actor, type Role } from '@/modules/identity/domain/access'
import { attempt, err, ok, type Result } from '@/shared/result'
import { adminError, type AdminError } from '../domain/errors'
import { componerHoy, fechaEnBolivia, HORIZONTE_RIESGO, type Hoy } from '../domain/hoy'
import { resumirIngresos, type Ingresos } from '../domain/ingresos'
import type { AdminEventRow, AdminMetrics, AdminRepository, AdminUserRow, AuditRow, IncomeReader, TodayReader } from './ports'

type Deps = { admin: AdminRepository }

export const listUsers = (deps: Deps) => async (): Promise<Result<AdminUserRow[], AdminError>> =>
  attempt(
    async () => ok(await deps.admin.listUsers()),
    (cause) => adminError('storage_failure', `No se pudieron leer los usuarios: ${String(cause)}`),
  )

export const listAllEvents = (deps: Deps) => async (): Promise<Result<AdminEventRow[], AdminError>> =>
  attempt(
    async () => ok(await deps.admin.listEvents()),
    (cause) => adminError('storage_failure', `No se pudieron leer los eventos: ${String(cause)}`),
  )

export const readMetrics = (deps: Deps) => async (): Promise<Result<AdminMetrics, AdminError>> =>
  attempt(
    async () => ok(await deps.admin.metrics()),
    (cause) => adminError('storage_failure', `No se pudieron calcular las métricas: ${String(cause)}`),
  )

export const readAudit =
  (deps: Deps) =>
  async (limit = 200): Promise<Result<AuditRow[], AdminError>> =>
    attempt(
      async () => ok(await deps.admin.listAudit(limit)),
      (cause) => adminError('storage_failure', `No se pudo leer la auditoría: ${String(cause)}`),
    )

/**
 * Cambia el rol de un usuario.
 *
 * Degradar tiene dos frenos, y los dos evitan el mismo desastre: nadie se quita el rol a
 * sí mismo y no se degrada al último admin. Cualquiera de las dos cosas deja el sistema
 * sin nadie que administre y sin forma de arreglarlo desde la aplicación.
 */
export const setUserRole =
  (deps: Deps) =>
  async (actor: Actor, input: { userId: string; role: Role }): Promise<Result<null, AdminError>> =>
    attempt(
      async () => {
        const usuario = await deps.admin.findUserById(input.userId)
        if (usuario === null) return err(adminError('not_found', `No existe el usuario ${input.userId}`))

        if (input.role === 'atelier' && usuario.role === 'admin') {
          const adminCount = await deps.admin.countAdmins()
          if (!canDemote(actor, { userId: input.userId, adminCount })) {
            return err(
              input.userId === actor.userId
                ? adminError('self', 'No puedes quitarte a ti mismo el rol de administrador.')
                : adminError('last_admin', 'Es el único administrador que queda.'),
            )
          }
        }

        await deps.admin.setRole(input.userId, input.role)
        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: 'usuario.rol',
          subject: usuario.email,
          detail: `${usuario.role} → ${input.role}`,
        })

        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudo cambiar el rol: ${String(cause)}`),
    )

const MOTIVO = {
  tiene_eventos: 'has_events',
  es_uno_mismo: 'self',
  ultimo_admin: 'last_admin',
} as const

/**
 * Borra un usuario.
 *
 * **Con eventos, no.** La columna es `ON DELETE RESTRICT` y la base lo rechazaría igual;
 * comprobarlo aquí es lo que permite decir *cuántos* tiene en vez de enseñar un error de
 * clave foránea que no le dice nada a nadie.
 */
export const deleteUser =
  (deps: Deps) =>
  async (actor: Actor, userId: string): Promise<Result<null, AdminError>> =>
    attempt(
      async () => {
        const usuario = await deps.admin.findUserById(userId)
        if (usuario === null) return err(adminError('not_found', `No existe el usuario ${userId}`))

        const veredicto = canDeleteUser(actor, {
          userId,
          eventos: usuario.eventos,
          targetIsAdmin: usuario.role === 'admin',
          adminCount: await deps.admin.countAdmins(),
        })

        if (!veredicto.ok) {
          const detalle =
            veredicto.reason === 'tiene_eventos'
              ? `Gestiona ${usuario.eventos} evento${usuario.eventos === 1 ? '' : 's'}: reasígnalos o bórralos primero.`
              : veredicto.reason === 'es_uno_mismo'
                ? 'No puedes borrarte a ti mismo.'
                : 'Es el único administrador que queda.'
          return err(adminError(MOTIVO[veredicto.reason], detalle))
        }

        await deps.admin.deleteUser(userId)
        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: 'usuario.borrado',
          subject: usuario.email,
        })

        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudo borrar el usuario: ${String(cause)}`),
    )

export const setEventPlan =
  (deps: Deps) =>
  async (actor: Actor, input: { eventId: string; eventSlug: string; planSlug: string }): Promise<Result<null, AdminError>> =>
    attempt(
      async () => {
        const planes = await deps.admin.listPlanSlugs()
        if (!planes.includes(input.planSlug)) {
          return err(adminError('invalid_input', `No existe el plan ${input.planSlug}`))
        }

        await deps.admin.setEventPlan(input.eventId, input.planSlug)
        await deps.admin.record({
          actorUserId: actor.userId,
          actorEmail: actor.email,
          action: 'evento.plan',
          subject: input.eventSlug,
          detail: input.planSlug,
        })

        return ok(null)
      },
      (cause) => adminError('storage_failure', `No se pudo cambiar el plan: ${String(cause)}`),
    )

/** Se anota aparte porque reasignar y borrar viven en el módulo de eventos. */
export const recordAdminAction =
  (deps: Deps) =>
  async (actor: Actor, entry: { action: string; subject?: string | null; detail?: string | null }): Promise<void> => {
    await deps.admin.record({
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action: entry.action,
      subject: entry.subject ?? null,
      detail: entry.detail ?? null,
    })
  }

/** «Hoy» del admin: la foto de la base compuesta con las reglas de `domain/hoy.ts`. */
export const readToday =
  (deps: { today: TodayReader; clock: () => Date }) =>
  async (): Promise<Result<{ fecha: string; hoy: Hoy }, AdminError>> =>
    attempt(
      async () => {
        const fecha = fechaEnBolivia(deps.clock())
        const crudo = await deps.today.snapshot(fecha, HORIZONTE_RIESGO)
        return ok({ fecha, hoy: componerHoy(crudo, fecha) })
      },
      (cause) => adminError('storage_failure', `No se pudo leer «Hoy»: ${String(cause)}`),
    )

/** Lo cobrado, con la fecha de Bolivia. */
export const readIncome =
  (deps: { income: IncomeReader; clock: () => Date }) =>
  async (): Promise<Result<Ingresos, AdminError>> =>
    attempt(
      async () => ok(resumirIngresos(await deps.income.pedidos(), fechaEnBolivia(deps.clock()))),
      (cause) => adminError('storage_failure', `No se pudieron leer los ingresos: ${String(cause)}`),
    )

import type { Role } from '@/modules/identity/domain/access'

export type AdminUserRow = {
  readonly id: string
  readonly email: string
  readonly role: Role
  readonly createdAt: Date
  /** Cuántos eventos gestiona. Es lo que decide si se puede borrar. */
  readonly eventos: number
}

export type AdminEventRow = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly status: string
  readonly ownerId: string | null
  readonly ownerEmail: string | null
  readonly planSlug: string | null
  readonly grupos: number
}

export type AuditRow = {
  readonly id: string
  readonly actorEmail: string
  readonly action: string
  readonly subject: string | null
  readonly detail: string | null
  readonly createdAt: Date
}

export type AdminMetrics = {
  readonly eventos: number
  readonly usuarios: number
  readonly invitados: number
  readonly pedidosAprobados: number
  /** Eventos por mes, de los últimos doce, en orden cronológico. */
  readonly porMes: readonly { readonly mes: string; readonly total: number }[]
  readonly porPlan: readonly { readonly plan: string; readonly total: number }[]
}

export interface AdminRepository {
  listUsers(): Promise<AdminUserRow[]>
  countAdmins(): Promise<number>
  findUserById(id: string): Promise<AdminUserRow | null>
  setRole(userId: string, role: Role): Promise<void>
  deleteUser(userId: string): Promise<void>
  listEvents(): Promise<AdminEventRow[]>
  setEventPlan(eventId: string, planSlug: string): Promise<void>
  listPlanSlugs(): Promise<string[]>
  metrics(): Promise<AdminMetrics>
  listAudit(limit: number): Promise<AuditRow[]>
  /**
   * Deja constancia. Copia el correo del actor como texto, además de su identificador:
   * borrar al admin no puede borrar el rastro de lo que hizo.
   */
  record(entry: {
    actorUserId: string
    actorEmail: string
    action: string
    subject?: string | null
    detail?: string | null
  }): Promise<void>
}

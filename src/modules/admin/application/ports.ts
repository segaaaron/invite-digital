import type { Role } from '@/modules/identity/domain/access'
import type { HoyCrudo } from '../domain/hoy'
import type { PedidoCobro } from '../domain/ingresos'
import type { PlanLimpio, TextoPlanLimpio } from '../domain/plan-editable'

export type AdminUserRow = {
  readonly id: string
  readonly email: string
  readonly role: Role
  readonly createdAt: Date
  /** Cuántos eventos gestiona. Es lo que decide si se puede borrar. */
  readonly eventos: number
  /** El plan que compró; `null` sin plan asignado. */
  readonly planSlug: string | null
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
  /** Grupos con enlace vigente: los revocados no cuentan. */
  readonly grupos: number
  /** De esos, cuántos tienen el enlace marcado como repartido. */
  readonly enviados: number
  /** Y cuántos contestaron, sí o no. */
  readonly respondidos: number
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
  /** Eventos por mes, de los **doce que vienen**: en este negocio están por delante. */
  readonly porMes: readonly { readonly mes: string; readonly total: number }[]
  readonly porPlan: readonly { readonly plan: string; readonly total: number }[]
}

export interface SettingsRepository {
  readAll(): Promise<Record<string, string>>
  write(entries: Record<string, string>): Promise<void>
}

export interface AdminRepository {
  listUsers(): Promise<AdminUserRow[]>
  countAdmins(): Promise<number>
  findUserById(id: string): Promise<AdminUserRow | null>
  setRole(userId: string, role: Role): Promise<void>
  /** `null` le quita el plan. El `slug` ya viene validado contra `listPlanSlugs`. */
  setUserPlan(userId: string, planSlug: string | null): Promise<void>
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

/**
 * Dónde vive la imagen del QR de cobro. Es el mismo puerto que usan los comprobantes del
 * Plan B —disco hoy, S3 mañana— y por eso se declara aquí en vez de importarlo: el módulo
 * de administración no conoce el de pedidos.
 */
export interface FileStore {
  put(key: string, bytes: Uint8Array): Promise<void>
  get(key: string): Promise<Uint8Array | null>
  /**
   * Borra un fichero. **Borrar lo que ya no está no es un fallo**: al reemplazar la música
   * de un modelo se borra la anterior, y esa operación puede repetirse.
   *
   * Existe porque sin ella cada reemplazo deja un huérfano en el volumen y nadie sabe
   * después cuáles sobran.
   */
  remove(key: string): Promise<void>
}

/**
 * La lectura de «Hoy». Un puerto aparte de `AdminRepository` porque es una sola foto de
 * solo lectura, y porque los dobles de prueba del repositorio no tienen por qué fingirla.
 *
 * Trae filas **crudas**: qué es un aviso lo decide `domain/hoy.ts`, con la fecha como
 * argumento.
 */
export interface TodayReader {
  snapshot(hoy: string, horizonteDias: number): Promise<HoyCrudo>
}

export type PlanAdminRow = {
  readonly id: string
  readonly slug: string
  readonly priceCents: number
  readonly currency: string
  readonly maxGuestGroups: number | null
  readonly includesSeating: boolean
  readonly includesRegistry: boolean
  readonly includesCheckin: boolean
  readonly highlighted: boolean
  readonly isActive: boolean
  /** Cuántos eventos lo tienen: es lo que pesa antes de cambiarle el tope. */
  readonly eventos: number
  readonly es: TextoPlanLimpio | null
  readonly en: TextoPlanLimpio | null
}

/**
 * Lo comercial del catálogo que el admin edita sin desplegar: los planes y qué modelos se
 * publican. Puerto aparte, como `TodayReader`, para no obligar a los dobles de
 * `AdminRepository` a fingirlo.
 */
export interface CatalogAdmin {
  listPlans(): Promise<PlanAdminRow[]>
  /**
   * Plan y sus dos traducciones, en una transacción. `ultimo_activo` si al guardarlo no
   * quedaría ningún plan activo: se comprueba **dentro** de la transacción y con bloqueo,
   * porque dos admins retirando dos planes distintos a la vez pasaban los dos la comprobación
   * previa y dejaban la web sin precios.
   */
  savePlan(slug: string, plan: PlanLimpio): Promise<'ok' | 'no_existe' | 'ultimo_activo'>
  publication(): Promise<Record<string, boolean>>
  /** `false` si no hay plantilla con esa clave. */
  setPublished(slug: string, published: boolean): Promise<boolean>
}

/** Los pedidos tal como los necesita la pantalla de ingresos. Solo lectura. */
export interface IncomeReader {
  pedidos(): Promise<PedidoCobro[]>
}

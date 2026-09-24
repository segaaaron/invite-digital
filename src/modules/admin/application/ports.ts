import type { Role } from '@/modules/identity'
import type { HoyCrudo } from '../domain/hoy'
import type { CifrasDeHoy, ConteoDeVenta, PedidoCobro } from '../domain/ingresos'
import type { PlanLimpio, TextoPlanLimpio } from '../domain/plan-editable'

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
  /** El diseño: la cartera pinta su portada. */
  readonly themeKey: string
  /** Grupos con enlace vigente: los revocados no cuentan. */
  readonly grupos: number
  /** De esos, cuántos tienen el enlace marcado como repartido. */
  readonly enviados: number
  /** Y cuántos contestaron, sí o no. */
  readonly respondidos: number
  /** Invitaciones (grupos) que se abrieron al menos una vez. */
  readonly abiertos: number
}

export type AuditRow = {
  readonly id: string
  readonly actorEmail: string
  readonly action: string
  readonly subject: string | null
  readonly detail: string | null
  readonly createdAt: Date
}

/** Lo que acota la auditoría. `prefijos` sale de un grupo (`prefijosDeGrupo`); `patron`, de `patronDeBusqueda`. */
export type FiltroDeAuditoria = {
  readonly actorEmail?: string | undefined
  readonly prefijos?: readonly string[] | undefined
  readonly patron?: string | undefined
}

export type AdminMetrics = {
  readonly eventos: number
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
  deleteUser(userId: string): Promise<void>
  listEvents(): Promise<AdminEventRow[]>
  setEventPlan(eventId: string, planSlug: string): Promise<void>
  listPlanSlugs(): Promise<string[]>
  /** Los planes para un selector: su clave y el nombre que se lee, en orden de venta. */
  listPlanOptions(): Promise<{ slug: string; nombre: string; priceCents: number }[]>
  metrics(): Promise<AdminMetrics>
  listAudit(limit: number, filtro?: FiltroDeAuditoria): Promise<AuditRow[]>
  /** Quiénes aparecen en el registro, para el filtro «Quién». */
  listAuditActors(): Promise<string[]>
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
  readonly maxDoorPorters: number
  readonly maxCohosts: number | null
  readonly maxHiredPlanners: number | null
  readonly maxGalleryPhotos: number | null
  readonly guestPhotos: boolean
  readonly eventPassword: boolean
  readonly csvImport: boolean
  readonly onlineDays: number
  readonly designChange: string
  readonly plannerSuite: string
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
  /** Lo que entró por cada puerta desde `desde`. */
  conteoDeVenta(desde: Date): Promise<ConteoDeVenta>
  /** Las cifras de «Hoy» del mes `YYYY-MM` de Bolivia, sumadas en la base. */
  cifrasDelMes(mes: string): Promise<CifrasDeHoy>
}

export type SiteVersionRow = {
  readonly id: string
  readonly createdAt: Date
  readonly actorEmail: string
  readonly campos: readonly string[]
  readonly data: unknown
}

/** El historial de «La web». Cada guardado deja una foto; restaurar es guardar una foto vieja. */
/**
 * El almacén de «La web»: lo vigente, su historial y **una sola escritura atómica**.
 *
 * `commit` guarda el valor, su versión y la entrada de auditoría en una transacción: o
 * entran las tres o ninguna. Y compara `base` —la última versión que vio quien editaba— con
 * la última guardada bajo candado: si otro admin guardó entre medias, no escribe nada y
 * devuelve esa versión. Sin eso, el segundo guardado pisaría al primero sin avisar.
 */
export interface SiteSettingsStore {
  /** Lo guardado tal cual (sin fila, `undefined`) y el id de la última versión. */
  current(): Promise<{ crudo: string | undefined; ultimaVersion: string | null }>
  commit(entrada: {
    base: string | null
    data: unknown
    /** La foto de partida: se guarda como primera versión si todavía no hay ninguna. */
    partida: unknown
    campos: readonly string[]
    actorUserId: string
    actorEmail: string
    accion: string
  }): Promise<{ ok: true } | { ok: false; ultima: SiteVersionRow }>
  list(limit: number): Promise<SiteVersionRow[]>
  find(id: string): Promise<SiteVersionRow | null>
}

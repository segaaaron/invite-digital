import type { Role } from '@/modules/identity'
import type { CambioDePlan } from '../domain/hoy'
import type { CifrasDeHoy, ConteoDeVenta, PedidoCobro } from '../domain/ingresos'
import type { PlanLimpio, TextoPlanLimpio } from '../domain/plan-editable'

export type AdminUserRow = {
  readonly id: string
  readonly email: string
  readonly role: Role
  readonly createdAt: Date
  /** Cuántos eventos gestiona. Es lo que decide si se puede borrar. */
  readonly eventos: number
  /** Su nombre, si se sabe (`users.full_name`). */
  readonly fullName?: string | null
  /** La última vez que usó el panel, de sus sesiones. */
  readonly ultimoAcceso?: Date | null
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
  /** El cierre de las confirmaciones (`YYYY-MM-DD`). */
  readonly rsvpDeadline: string
  /** Si la invitación trae lo mínimo para repartirla: fecha y hora, y lugar de la recepción. */
  readonly invitacionEscrita: boolean
  /** Si alguien entra como anfitrión (cliente) a este evento. */
  readonly conCliente: boolean
  /** Su cliente recibió el acceso y todavía no entró (sigue con la contraseña provisional). */
  readonly clienteSinEntrar: boolean
  /** Un pedido de este evento aprobado con anticipo y el saldo sin registrar. */
  readonly saldoPendiente: boolean
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
  /** Las solicitudes de cambio de plan pendientes: lo único de «Hoy» que no sale de ventas ni eventos. */
  cambiosDePlan(): Promise<CambioDePlan[]>
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
  /** El anticipo que pide, en porcentaje. 0: se paga entero. */
  readonly depositPct: number
  /** La reserva fija en centavos; si está, manda sobre el porcentaje. */
  readonly depositFixedCents: number | null
  readonly priceUsdCents: number | null
  readonly includesGuestbook: boolean
  readonly includesGiftWays: boolean
  readonly includesStyle: boolean
  /** Diseño por encargo: rondas y días de entrega. Nulos: autoservicio. */
  readonly correctionRounds: number | null
  readonly deliveryDays: number | null
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

/** La nota y las etiquetas de un cliente (`client_notes`), por cualquiera de sus claves de contacto. */
export type NotaDeCliente = { readonly clave: string; readonly note: string | null; readonly tags: readonly string[]; readonly updatedAt: Date }

export interface ClientNotes {
  /** Las notas guardadas bajo cualquiera de estas claves. */
  leer(claves: readonly string[]): Promise<NotaDeCliente[]>
  guardar(clave: string, note: string | null, tags: readonly string[]): Promise<void>
}

/** Los códigos de referido de los eventos y cuántas compras trajo cada uno. */
export interface Referidos {
  deEventos(eventIds: readonly string[]): Promise<Map<string, string>>
  /** Crea el código del evento si no tiene; si ya lo tenía, devuelve el suyo. */
  crear(eventId: string, codigo: string): Promise<string>
  existe(codigo: string): Promise<boolean>
  /** Cuántos pedidos no cancelados llegaron con cada código. */
  usos(codigos: readonly string[]): Promise<Map<string, number>>
  /** El evento del código y los correos de sus anfitriones, para darles las gracias. */
  anfitrionesDe(codigo: string): Promise<{ readonly evento: string; readonly correos: readonly string[] } | null>
}

/** Un evento que el mantenimiento diario mira para acompañar a sus anfitriones. */
export type EventoAcompanado = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly rsvpDeadline: string
  readonly themeKey: string
  readonly grupos: number
  readonly enviados: number
  readonly respondidos: number
  readonly invitacionEscrita: boolean
  /** Los correos de sus anfitriones (clientes con acceso). */
  readonly anfitriones: readonly string[]
  readonly yaEnviados: readonly string[]
}

export type OpinionDeEvento = { readonly rating: number | null; readonly comment: string | null; readonly allowPublish: boolean; readonly answeredAt: Date | null }

export interface Acompanamiento {
  /** Los eventos vivos entre un año atrás y once semanas por delante: los únicos que pueden tocar. */
  eventos(hoy: string): Promise<EventoAcompanado[]>
  /** Aparta el aviso antes de mandarlo: `false` si ya estaba (otro pase lo mandó). */
  reservar(eventId: string, kind: string): Promise<boolean>
  /** Lo devuelve si el correo no salió, para reintentar mañana. */
  liberar(eventId: string, kind: string): Promise<void>
  /** La encuesta del evento con el hash de su enlace; si había una sin responder, la sustituye. */
  crearEncuesta(eventId: string, tokenHash: Buffer): Promise<void>
  encuesta(tokenHash: Buffer): Promise<{ readonly eventTitle: string; readonly respondida: boolean } | null>
  /** Guarda la respuesta una sola vez. `false` si ya estaba respondida o no existe. */
  responder(tokenHash: Buffer, respuesta: { rating: number; comment: string | null; allowPublish: boolean }): Promise<boolean>
  opiniones(eventIds: readonly string[]): Promise<Map<string, OpinionDeEvento>>
}

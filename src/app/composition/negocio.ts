import { ffmpegAudioProcessor } from '@/shared/audio/ffmpeg-audio-processor'
import { attachProof, decideOrder, findOrderByRef, listOrdersPage, placeAddonOrder, placeOrder, readProof } from '@/modules/orders/application/order-use-cases'
import { createDiskFileStorage } from '@/modules/orders/infrastructure/disk-file-storage'
import { deleteUser as deleteUserUseCase, listAllEvents, listUsers, readAudit, readMetrics, readIncome, readToday, readTodayMoney, recordAdminAction, setEventPlan as setEventPlanUseCase, setUserRole as setUserRoleUseCase } from '@/modules/admin/application/admin-use-cases'
import { readPaymentSettings, savePaymentQr, savePaymentSettings } from '@/modules/admin/application/payment-use-cases'
import { readShowcaseMusic, readShowcaseSongs, removeShowcaseMusic, renameShowcaseSong, saveShowcaseMusic } from '@/modules/admin/application/showcase-music-use-cases'
import { createDiskShowcaseStorage } from '@/modules/admin/infrastructure/disk-showcase-storage'
import { drizzleAdminRepository } from '@/modules/admin/infrastructure/drizzle-admin-repository'
import { drizzleTodayReader } from '@/modules/admin/infrastructure/drizzle-today-reader'
import { drizzleCatalogAdmin } from '@/modules/admin/infrastructure/drizzle-catalog-admin'
import { drizzleIncomeReader } from '@/modules/admin/infrastructure/drizzle-income-reader'
import { drizzleBuscador } from '@/modules/admin/infrastructure/drizzle-buscador'
import { drizzleSiteSettingsStore } from '@/modules/admin/infrastructure/drizzle-site-settings-store'
import { listSiteVersions, restoreSiteVersion, saveSiteSettings } from '@/modules/admin/application/site-settings-use-cases'
import { listPlansForAdmin, readPublication, savePlan as savePlanUseCase, setTemplatePublished as setTemplatePublishedUseCase } from '@/modules/admin/application/catalog-use-cases'
import { CATALOG_LISTOS } from '@/shared/design/theme-catalog'
import { drizzleSettingsRepository } from '@/modules/admin/infrastructure/drizzle-settings-repository'
import type { Role } from '@/modules/identity'
import { drizzleOrderRepository } from '@/modules/orders/infrastructure/drizzle-order-repository'
import { env } from '@/shared/config/env'
import { applyPlanChange, getPendingRequest, rejectPlanChange, requestPlanChange } from '@/modules/plans/application/change-request-use-cases'
import { getEventAllowance } from '@/modules/plans/application/get-event-allowance'
import { requireFeature } from '@/modules/plans/application/require-feature'
import { drizzlePlansRepository } from '@/modules/plans/infrastructure/drizzle-plans-repository'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { drizzleUserRepository } from '@/modules/identity/infrastructure/drizzle-user-repository'
import { clock, leerSitio } from './base'

/**
 * El plan del evento y lo que permite. Nadie más lo importa: `guests`, `venue`,
 * `registry` y `checkin` reciben la capacidad ya resuelta como argumento desde sus
 * acciones, que es donde vive la frontera.
 */
export const plans = {
  allowanceFor: getEventAllowance({ plans: drizzlePlansRepository }),
  requireFeature: requireFeature({ plans: drizzlePlansRepository }),
  listActive: () => drizzlePlansRepository.listActivePlans(),
  /** El activo más barato por precio: el que se aplica a un evento sin plan. */
  cheapestActive: () => drizzlePlansRepository.findCheapestActivePlan(),
  requestChange: requestPlanChange({ plans: drizzlePlansRepository, ids: () => crypto.randomUUID(), clock }),
  applyChange: applyPlanChange({ plans: drizzlePlansRepository, ids: () => crypto.randomUUID(), clock }),
  rejectChange: rejectPlanChange({ plans: drizzlePlansRepository, ids: () => crypto.randomUUID(), clock }),
  pendingChange: getPendingRequest({ plans: drizzlePlansRepository }),
  /** Aplica el extra de un pedido aprobado. Una sola vez por pedido. */
  applyExtra: (orderId: string) => drizzlePlansRepository.applyExtra(orderId),
  /** Los extras a la venta, del más barato de orden. */
  listActiveExtras: () => drizzlePlansRepository.listExtras(true),
  /** Todo el catálogo de extras, para el admin. */
  listAllExtras: () => drizzlePlansRepository.listExtras(false),
  updateExtra: (slug: string, extra: Parameters<typeof drizzlePlansRepository.updateExtra>[1]) => drizzlePlansRepository.updateExtra(slug, extra),
  /** Los que compró el evento, para enseñarlos en su plan. */
  eventExtras: (eventId: string) => drizzlePlansRepository.listEventExtras(eventId),
} as const

/**
 * El libro de firmas. Todo lo de aquí es del atelier: el invitado ya escribió su mensaje
 * al confirmar y en esta rebanada solo lee la respuesta, sin ninguna escritura nueva.
 */
/**
 * El almacén de comprobantes vive fuera de `public/`: ahí dentro estarían publicados en
 * internet, y un comprobante lleva nombre, banco y cuenta de una persona.
 */
const proofStorage = createDiskFileStorage(env.ORDERS_DIR)

/**
 * La música de los modelos del escaparate, en su propia carpeta dentro del volumen de
 * medios. Separada de los comprobantes a propósito: son datos de distinta naturaleza y con
 * distinta vida, y limpiar lo uno no puede llevarse lo otro.
 */
const showcaseStorage = createDiskShowcaseStorage(`${env.EVENT_MEDIA_DIR}/escaparate`)

export const orders = {
  place: placeOrder({ orders: drizzleOrderRepository, clock }),
  /** El pedido de un extra desde el panel del evento. */
  placeAddon: placeAddonOrder({ orders: drizzleOrderRepository, clock }),
  /** Los que esperan decisión, contados en la base: la insignia de la barra no trae la bandeja. */
  porRevisar: () => drizzleOrderRepository.countByStatus('proof_submitted'),
  /** Los pedidos de extras de un evento, para su pantalla de extras. */
  extrasDe: (eventId: string) => drizzleOrderRepository.listAddonOrdersOf(eventId),
  byRef: findOrderByRef({ orders: drizzleOrderRepository, clock }),
  attachProof: attachProof({
    orders: drizzleOrderRepository,
    storage: proofStorage,
    clock,
    newKey: () => crypto.randomUUID(),
  }),
  /** Una página de la bandeja con su recuento por estado: se pagina en la base. */
  page: listOrdersPage({ orders: drizzleOrderRepository, clock }),
  /**
   * Un pedido por su identificador, sin sus comprobantes.
   *
   * Va directo al repositorio —como `actorOf` y `passwordHashOf`— porque no hay ninguna
   * decisión que tomar: lo usa la aprobación para leer el diseño, el plan y la fecha con
   * los que nace la boda.
   */
  byId: (id: string) => drizzleOrderRepository.findById(id),
  /**
   * Ata el pedido a la boda que creó al aprobarse.
   *
   * Va a la base porque el mensaje de la acción **no sobrevive**: al aprobar, el pedido
   * deja de estar «por revisar» y el formulario de decisión se desmonta con su estado
   * dentro. Lo que la bandeja enseña después sale de aquí.
   */
  linkEvent: (orderId: string, eventId: string) => drizzleOrderRepository.linkEvent(orderId, eventId),
  decide: decideOrder({ orders: drizzleOrderRepository, clock }),
  readProof: readProof({ orders: drizzleOrderRepository, storage: proofStorage, clock }),
}

export const admin = {
  users: listUsers({ admin: drizzleAdminRepository }),
  events: listAllEvents({ admin: drizzleAdminRepository }),
  metrics: readMetrics({ admin: drizzleAdminRepository }),
  today: readToday({ today: drizzleTodayReader, clock: () => new Date() }),
  income: readIncome({ income: drizzleIncomeReader, clock: () => new Date() }),
  todayMoney: readTodayMoney({ income: drizzleIncomeReader, clock: () => new Date() }),
  /** «La web»: datos del negocio, pruebas sociales, textos legales y SEO, con historial. */
  siteSettings: leerSitio,
  saveSite: saveSiteSettings({ store: drizzleSiteSettingsStore }),
  siteVersions: listSiteVersions({ store: drizzleSiteSettingsStore }),
  restoreSite: restoreSiteVersion({ store: drizzleSiteSettingsStore }),
  /** Lo comercial del catálogo: planes y qué modelos se publican. */
  plans: listPlansForAdmin({ catalog: drizzleCatalogAdmin }),
  savePlan: savePlanUseCase({ catalog: drizzleCatalogAdmin, admin: drizzleAdminRepository }),
  publication: readPublication({ catalog: drizzleCatalogAdmin }),
  setPublished: setTemplatePublishedUseCase({
    catalog: drizzleCatalogAdmin,
    admin: drizzleAdminRepository,
    // Un retirado no se vuelve a publicar desde el panel: se retiró a propósito.
    conocidos: () => CATALOG_LISTOS.filter((entrada) => entrada.retirado !== true).map((entrada) => entrada.key),
  }),
  audit: readAudit({ admin: drizzleAdminRepository }),
  /** Quiénes aparecen en la auditoría, para su filtro. */
  auditActors: () => drizzleAdminRepository.listAuditActors(),
  /** La búsqueda del admin en eventos, pedidos, consultas y usuarios. */
  buscar: drizzleBuscador,
  setRole: setUserRoleUseCase({ admin: drizzleAdminRepository }),
  deleteUser: deleteUserUseCase({ admin: drizzleAdminRepository }),
  setEventPlan: setEventPlanUseCase({ admin: drizzleAdminRepository }),
  record: recordAdminAction({ admin: drizzleAdminRepository }),
  planOptions: () => drizzleAdminRepository.listPlanOptions(),
  /** El alta la hace el admin: no hay registro público. */
  createUser: async (input: { email: string; password: string; role: Role }) => {
    const passwordHash = await argon2Hasher.hash(input.password)
    return drizzleUserRepository.create({ email: input.email, passwordHash, role: input.role })
  },
  findUserByEmail: (email: string) => drizzleUserRepository.findByEmail(email),
  /** Nombre y teléfono de quien compra, sin pisar los que ya tenía. */
  completarContacto: (userId: string, contacto: { fullName: string | null; phone: string | null }) =>
    drizzleUserRepository.completarContacto(userId, contacto),
  /**
   * Los datos de cobro del Plan B. Comparten almacén con los comprobantes —el mismo
   * volumen fuera de `public/`— pero la imagen del QR **sí** se sirve sin sesión: está
   * hecha para que la vea quien va a pagar.
   */
  payment: readPaymentSettings({ settings: drizzleSettingsRepository }),
  savePayment: savePaymentSettings({ settings: drizzleSettingsRepository, admin: drizzleAdminRepository }),
  savePaymentQr: savePaymentQr({
    settings: drizzleSettingsRepository,
    admin: drizzleAdminRepository,
    storage: proofStorage,
    newKey: () => crypto.randomUUID(),
  }),
  readFile: (key: string) => proofStorage.get(key),

  /**
   * La música de los dieciséis modelos del escaparate.
   *
   * **Almacén propio**, sobre el volumen de los medios del evento y no sobre el de los
   * comprobantes: un comprobante lleva datos de una persona y se barre cuando su pedido
   * vence; esto es la música de la web pública y dura lo que dure el modelo. Compartir
   * carpeta significaría que limpiar lo uno pueda llevarse lo otro.
   */
  showcaseSongs: readShowcaseSongs({ settings: drizzleSettingsRepository, storage: showcaseStorage }),
  showcaseMusic: readShowcaseMusic({ settings: drizzleSettingsRepository, storage: showcaseStorage }),
  renameShowcaseSong: renameShowcaseSong({ settings: drizzleSettingsRepository, storage: showcaseStorage, admin: drizzleAdminRepository }),
  saveShowcaseMusic: saveShowcaseMusic({
    settings: drizzleSettingsRepository,
    storage: showcaseStorage,
    admin: drizzleAdminRepository,
    audio: ffmpegAudioProcessor,
    newKey: () => crypto.randomUUID(),
  }),
  removeShowcaseMusic: removeShowcaseMusic({
    settings: drizzleSettingsRepository,
    storage: showcaseStorage,
    admin: drizzleAdminRepository,
  }),
  /** Lo lee la ruta pública `/modelos/musica/<tema>`, que sirve sin sesión. */
  readShowcaseFile: (key: string) => showcaseStorage.get(key),
}

// Raíz de composición: el único lugar donde se conectan los puertos de `application`
// con sus implementaciones de `infrastructure`. Vive en `src/app` (no en `src/shared`)
// porque la configuración de fronteras de ESLint (`eslint.config.mjs`) solo permite que
// el tipo `app` importe de `infrastructure`; `shared` solo puede importar de `shared`.
// Ver el informe de la Task 7 para el detalle de esta decisión.
import {
  createClientShare,
  getLiveClientShare,
  resolveClientShare,
  revokeClientShare,
} from '@/modules/events/application/client-share-use-cases'
import { anonymizeExpiredEvents } from '@/modules/events/application/anonymize-expired-events'
import { createEventUseCase } from '@/modules/events/application/create-event'
import { getEventById, getEventBySlug } from '@/modules/events/application/get-event'
import {
  actorCanTouchEvent,
  getEventByIdFor,
  getEventFor,
  listEventsFor,
} from '@/modules/events/application/tenancy'
import { deleteEvent } from '@/modules/events/application/delete-event'
import { checkEventPassword, setEventPassword } from '@/modules/events/application/event-access'
import { drizzleAccessRepository } from '@/modules/events/infrastructure/drizzle-access-repository'
import { listEvents } from '@/modules/events/application/list-events'
import { updateEventUseCase } from '@/modules/events/application/update-event'
import { drizzleClientShareRepository } from '@/modules/events/infrastructure/drizzle-client-share-repository'
import { drizzleEventRepository } from '@/modules/events/infrastructure/drizzle-event-repository'
import { drizzleStaffRepository } from '@/modules/events/infrastructure/drizzle-staff-repository'
import { adjustArrival } from '@/modules/checkin/application/adjust-arrival'
import { checkInByGroup } from '@/modules/checkin/application/check-in-by-group'
import { checkInByScan } from '@/modules/checkin/application/check-in-by-scan'
import { getDoorManifest } from '@/modules/checkin/application/get-door-manifest'
import { getDoorState } from '@/modules/checkin/application/get-door-state'
import { voidArrival } from '@/modules/checkin/application/void-arrival'
import {
  drizzleArrivalRepository,
  drizzleDoorGroupReader,
} from '@/modules/checkin/infrastructure/drizzle-arrival-repository'
import { assignGroup, autoAssignGroups, unassignGroup } from '@/modules/venue/application/assign-use-cases'
import { listSeating } from '@/modules/venue/application/list-seating'
import { recordView } from '@/modules/analytics/application/record-view'
import { getViewTally } from '@/modules/analytics/application/get-view-tally'
import { drizzleViewRepository } from '@/modules/analytics/infrastructure/drizzle-view-repository'
import { moveElements } from '@/modules/venue/application/move-element'
import { addTable, removeTable, updateTable } from '@/modules/venue/application/table-use-cases'
import { addZone, removeZone, updateZone } from '@/modules/venue/application/zone-use-cases'
import { drizzleVenueRepository } from '@/modules/venue/infrastructure/drizzle-venue-repository'
import { claimGift, releaseGift } from '@/modules/registry/application/claim-gift'
import { addFund, recordContribution, removeFund, updateFund } from '@/modules/registry/application/fund-use-cases'
import {
  addGift,
  markPurchased,
  releaseGiftAsAtelier,
  removeGift,
  updateGift,
} from '@/modules/registry/application/gift-use-cases'
import { listRegistry } from '@/modules/registry/application/list-registry'
import { drizzleRegistryRepository } from '@/modules/registry/infrastructure/drizzle-registry-repository'
import {
  getGuestReply,
  listGuestbook,
  markRead,
  replyToMessage,
  toggleFeatured,
} from '@/modules/guestbook/application/guestbook-use-cases'
import { drizzleGuestbookRepository } from '@/modules/guestbook/infrastructure/drizzle-guestbook-repository'
import {
  attachProof,
  decideOrder,
  findOrderByRef,
  listOrders,
  placeOrder,
  readProof,
} from '@/modules/orders/application/order-use-cases'
import { createDiskFileStorage } from '@/modules/orders/infrastructure/disk-file-storage'
import {
  deleteUser as deleteUserUseCase,
  listAllEvents,
  listUsers,
  readAudit,
  readMetrics,
  recordAdminAction,
  setEventPlan as setEventPlanUseCase,
  setUserRole as setUserRoleUseCase,
} from '@/modules/admin/application/admin-use-cases'
import {
  readPaymentSettings,
  savePaymentQr,
  savePaymentSettings,
} from '@/modules/admin/application/payment-use-cases'
import { drizzleAdminRepository } from '@/modules/admin/infrastructure/drizzle-admin-repository'
import { drizzleSettingsRepository } from '@/modules/admin/infrastructure/drizzle-settings-repository'
import type { Role } from '@/modules/identity/domain/access'
import { drizzleOrderRepository } from '@/modules/orders/infrastructure/drizzle-order-repository'
import {
  createEventQrCode,
  listEventQrCodes,
  resolveQrCode,
  toggleEventQrCode,
  updateEventQrCode,
} from '@/modules/qr/application/qr-use-cases'
import { drizzleQrRepository } from '@/modules/qr/infrastructure/drizzle-qr-repository'
import { env } from '@/shared/config/env'
import { listDueReminders, markReminderSent } from '@/modules/reminders/application/reminder-use-cases'
import { drizzleReminderRepository } from '@/modules/reminders/infrastructure/drizzle-reminder-repository'
import {
  applyPlanChange,
  getPendingRequest,
  rejectPlanChange,
  requestPlanChange,
} from '@/modules/plans/application/change-request-use-cases'
import { getEventAllowance } from '@/modules/plans/application/get-event-allowance'
import { requireFeature } from '@/modules/plans/application/require-feature'
import { drizzlePlansRepository } from '@/modules/plans/infrastructure/drizzle-plans-repository'
import { isErr } from '@/shared/result'
import { addGuest } from '@/modules/guests/application/add-guest'
import { addGuestGroup } from '@/modules/guests/application/add-guest-group'
import { listGuestGroups } from '@/modules/guests/application/list-guest-groups'
import { importGuestGroups } from '@/modules/guests/application/import-guest-groups'
import { markInvitationSent } from '@/modules/guests/application/mark-invitation-sent'
import { resendInvitation } from '@/modules/guests/application/resend-invitation'
import {
  addPerson,
  listPeopleByEvent,
  removePerson,
  updatePerson,
} from '@/modules/guests/application/person-use-cases'
import { drizzleGuestPersonRepository } from '@/modules/guests/infrastructure/drizzle-guest-person-repository'
import { resolveByToken } from '@/modules/guests/application/resolve-by-token'
import { revokeInvitation } from '@/modules/guests/application/revoke-invitation'
import { drizzleGuestGroupRepository } from '@/modules/guests/infrastructure/drizzle-guest-group-repository'
import { getInvitation } from '@/modules/rsvp/application/get-invitation'
import { getEventStats } from '@/modules/rsvp/application/get-event-stats'
import { getTally } from '@/modules/rsvp/application/get-tally'
import { getRsvpTimeline } from '@/modules/rsvp/application/get-rsvp-timeline'
import { respondToInvitation } from '@/modules/rsvp/application/respond-to-invitation'
import { drizzleRsvpRepository } from '@/modules/rsvp/infrastructure/drizzle-rsvp-repository'
import { authenticateSession } from '@/modules/identity/application/authenticate-session'
import { signIn } from '@/modules/identity/application/sign-in'
import { signOut } from '@/modules/identity/application/sign-out'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { drizzleSessionRepository } from '@/modules/identity/infrastructure/drizzle-session-repository'
import { drizzleUserRepository } from '@/modules/identity/infrastructure/drizzle-user-repository'
import { createTokenMinter } from '@/shared/security/tokens'
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
  listCategories: listCategories({ categories: drizzleCategoryRepository }),
} as const

export const leads = {
  submitConsultation: submitConsultation({ requests: drizzleConsultationRepository, clock: () => new Date() }),
} as const

// Un solo acuñador para todo el proceso: no guarda estado, solo aleatoriedad del
// sistema y SHA-256.
const minter = createTokenMinter()
const clock = () => new Date()

export const identity = {
  signIn: signIn({ users: drizzleUserRepository, sessions: drizzleSessionRepository, hasher: argon2Hasher, minter, clock }),
  signOut: signOut({ sessions: drizzleSessionRepository, minter }),
  authenticateSession: authenticateSession({ sessions: drizzleSessionRepository, minter, clock }),
  /** Quién es y qué puede quien tiene esta sesión. Lo consume `requireSession()`. */
  actorOf: (userId: string) => drizzleUserRepository.findActor(userId),
} as const

export const events = {
  create: createEventUseCase({ events: drizzleEventRepository, ids: () => crypto.randomUUID() }),
  update: updateEventUseCase({ events: drizzleEventRepository }),
  /**
   * `getBySlug`, `getById` y `list` **sin actor** solo los usan la ruta del invitado —que
   * se autoriza por token—, el mantenimiento y el propio admin. Todo lo del panel pasa
   * por las versiones con actor: la firma es la guardia, y una página que no diga quién
   * pregunta no compila.
   */
  listAll: listEvents({ events: drizzleEventRepository }),
  getFor: getEventFor({ events: drizzleEventRepository, staff: drizzleStaffRepository }),
  getByIdFor: getEventByIdFor({ events: drizzleEventRepository, staff: drizzleStaffRepository }),
  listFor: listEventsFor({ events: drizzleEventRepository, staff: drizzleStaffRepository }),
  canTouch: actorCanTouchEvent({ events: drizzleEventRepository, staff: drizzleStaffRepository }),
  setOwner: (eventId: string, userId: string) => drizzleEventRepository.setOwner(eventId, userId),
  /**
   * El personal de puerta de un evento. Vive aquí y no en un módulo propio porque es una
   * pertenencia del evento, no una entidad con vida propia.
   */
  staff: {
    add: (eventId: string, userId: string) => drizzleStaffRepository.add(eventId, userId),
    remove: (eventId: string, userId: string) => drizzleStaffRepository.remove(eventId, userId),
    listUserIds: (eventId: string) => drizzleStaffRepository.listUserIds(eventId),
    listWithEmail: (eventId: string) => drizzleStaffRepository.listWithEmail(eventId),
  },
  remove: deleteEvent({ events: drizzleEventRepository }),
  setPassword: setEventPassword({
    events: drizzleEventRepository,
    access: drizzleAccessRepository,
    hasher: argon2Hasher,
  }),
  checkPassword: checkEventPassword({ access: drizzleAccessRepository, hasher: argon2Hasher }),
  /**
   * El hash de la contraseña del evento. Lo usa la cookie de desbloqueo como clave: así
   * cambiar la contraseña invalida por sí solo los desbloqueos ya repartidos, sin
   * inventar otro secreto que administrar.
   */
  passwordHashOf: (eventId: string) => drizzleAccessRepository.passwordHashOf(eventId),
  /**
   * Sin actor y a propósito: **solo** para lo que no tiene sesión de la que sacarlo —la
   * página del invitado, que se autoriza por token, y el mantenimiento— y para el admin,
   * que ve todo por definición. El nombre lo dice para que nadie las use por descuido
   * desde una vista del panel.
   */
  getBySlugUnscoped: getEventBySlug({ events: drizzleEventRepository }),
  getByIdUnscoped: getEventById({ events: drizzleEventRepository }),
  createShare: createClientShare({ shares: drizzleClientShareRepository, minter, ids: () => crypto.randomUUID(), clock }),
  revokeShare: revokeClientShare({ shares: drizzleClientShareRepository, clock }),
  liveShare: getLiveClientShare({ shares: drizzleClientShareRepository, clock }),
  resolveShare: resolveClientShare({ shares: drizzleClientShareRepository, events: drizzleEventRepository, minter, clock }),
  runMaintenance: anonymizeExpiredEvents({
    events: drizzleEventRepository,
    deleteExpiredSessions: (now) => drizzleSessionRepository.deleteExpired(now),
    deleteViewsForEvent: (eventId) => drizzleViewRepository.deleteForEvent(eventId),
    clock,
  }),
} as const

/**
 * El plan del evento y lo que permite. Nadie más lo importa: `guests`, `venue`,
 * `registry` y `checkin` reciben la capacidad ya resuelta como argumento desde sus
 * acciones, que es donde vive la frontera.
 */
export const plans = {
  allowanceFor: getEventAllowance({ plans: drizzlePlansRepository }),
  requireFeature: requireFeature({ plans: drizzlePlansRepository }),
  listActive: () => drizzlePlansRepository.listActivePlans(),
  requestChange: requestPlanChange({ plans: drizzlePlansRepository, ids: () => crypto.randomUUID(), clock }),
  applyChange: applyPlanChange({ plans: drizzlePlansRepository, ids: () => crypto.randomUUID(), clock }),
  rejectChange: rejectPlanChange({ plans: drizzlePlansRepository, ids: () => crypto.randomUUID(), clock }),
  pendingChange: getPendingRequest({ plans: drizzlePlansRepository }),
} as const

// Fuera del objeto: `addGuest` los compone, y un objeto que se referencia a sí mismo
// dentro de su propia definición no tiene tipo que TypeScript pueda inferir.
const altaDeGrupo = addGuestGroup({ groups: drizzleGuestGroupRepository, minter, ids: () => crypto.randomUUID(), clock })
const altaDePersona = addPerson({
  groups: drizzleGuestGroupRepository,
  people: drizzleGuestPersonRepository,
  ids: () => crypto.randomUUID(),
})

export const guests = {
  add: altaDeGrupo,
  list: listGuestGroups({ groups: drizzleGuestGroupRepository }),
  revoke: revokeInvitation({ groups: drizzleGuestGroupRepository, clock }),
  resolveByToken: resolveByToken({ groups: drizzleGuestGroupRepository, minter, clock }),
  // El alta de invitado de la maqueta: grupo —nuevo o existente—, persona, acompañantes,
  // teléfono y correo, en una sola pantalla. Compone los casos de uso que ya existen en
  // vez de duplicar sus reglas: el tope del plan y el cupo del grupo siguen viviendo
  // donde vivían.
  addGuest: addGuest({
    addGroup: async (input) => {
      const r = await altaDeGrupo(input)
      return isErr(r) ? { ok: false, message: r.error.detail } : { ok: true, group: r.value.group, token: r.value.token }
    },
    findGroup: (id) => drizzleGuestGroupRepository.findById(id),
    removeGroup: (id) => drizzleGuestGroupRepository.remove(id),
    setPhone: (id, phone) => drizzleGuestGroupRepository.setPhone(id, phone),
    addPerson: async (input) => {
      const r = await altaDePersona(input)
      return isErr(r) ? { ok: false, message: r.error.detail, kind: r.error.kind } : { ok: true }
    },
  }),
  addPerson: altaDePersona,
  updatePerson: updatePerson({ people: drizzleGuestPersonRepository, groups: drizzleGuestGroupRepository }),
  removePerson: removePerson({ people: drizzleGuestPersonRepository }),
  listPeople: listPeopleByEvent({ people: drizzleGuestPersonRepository }),
  markSent: markInvitationSent({ groups: drizzleGuestGroupRepository, clock }),
  resend: resendInvitation({ groups: drizzleGuestGroupRepository, minter, clock }),
  importCsv: importGuestGroups({
    groups: drizzleGuestGroupRepository,
    minter,
    ids: () => crypto.randomUUID(),
      clock,
  }),
  setPhone: (id: string, phone: string | null) => drizzleGuestGroupRepository.setPhone(id, phone),
} as const

export const rsvp = {
  respond: respondToInvitation({
    resolveGroup: (token) => guests.resolveByToken(token),
    findEventById: (id) => events.getByIdUnscoped(id),
    rsvp: drizzleRsvpRepository,
    ids: () => crypto.randomUUID(),
    clock,
  }),
  tally: getTally({ rsvp: drizzleRsvpRepository }),
  timeline: getRsvpTimeline({ rsvp: drizzleRsvpRepository, clock }),
  stats: getEventStats({ rsvp: drizzleRsvpRepository }),
  getInvitation: getInvitation({
    resolveGroup: (token) => guests.resolveByToken(token),
    findEventById: (id) => events.getByIdUnscoped(id),
    rsvp: drizzleRsvpRepository,
  }),
  latestFor: (guestGroupId: string) => drizzleRsvpRepository.latestFor(guestGroupId),
  /** La última respuesta de cada grupo del evento, en una sola consulta. */
  latestByEvent: (eventId: string) => drizzleRsvpRepository.latestByEvent(eventId),
} as const

export const checkin = {
  record: checkInByScan({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository, minter }),
  recordGroup: checkInByGroup({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository }),
  adjust: adjustArrival({ arrivals: drizzleArrivalRepository, groups: drizzleDoorGroupReader }),
  void: voidArrival({ arrivals: drizzleArrivalRepository, clock }),
  manifest: getDoorManifest({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository }),
  state: getDoorState({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository }),
} as const

export const analytics = {
  record: recordView({ views: drizzleViewRepository }),
  tally: getViewTally({ views: drizzleViewRepository, clock }),
} as const

export const venue = {
  addTable: addTable({ venue: drizzleVenueRepository, ids: () => crypto.randomUUID() }),
  updateTable: updateTable({ venue: drizzleVenueRepository }),
  removeTable: removeTable({ venue: drizzleVenueRepository }),
  assign: assignGroup({ venue: drizzleVenueRepository }),
  unassign: unassignGroup({ venue: drizzleVenueRepository }),
  autoAssign: autoAssignGroups({ venue: drizzleVenueRepository }),
  addZone: addZone({ venue: drizzleVenueRepository, ids: () => crypto.randomUUID() }),
  updateZone: updateZone({ venue: drizzleVenueRepository }),
  removeZone: removeZone({ venue: drizzleVenueRepository }),
  moveElements: moveElements({ venue: drizzleVenueRepository }),
  seating: listSeating({ venue: drizzleVenueRepository }),
} as const

export const registry = {
  // Del atelier, con sesión.
  addGift: addGift({ registry: drizzleRegistryRepository, ids: () => crypto.randomUUID() }),
  updateGift: updateGift({ registry: drizzleRegistryRepository }),
  removeGift: removeGift({ registry: drizzleRegistryRepository }),
  markPurchased: markPurchased({ registry: drizzleRegistryRepository, clock }),
  releaseAsAtelier: releaseGiftAsAtelier({ registry: drizzleRegistryRepository, clock }),
  addFund: addFund({ registry: drizzleRegistryRepository, ids: () => crypto.randomUUID() }),
  updateFund: updateFund({ registry: drizzleRegistryRepository }),
  removeFund: removeFund({ registry: drizzleRegistryRepository }),
  recordContribution: recordContribution({
    registry: drizzleRegistryRepository,
    ids: () => crypto.randomUUID(),
    clock,
  }),
  list: listRegistry({ registry: drizzleRegistryRepository }),

  // Del invitado, autorizadas por su token. Comparten el mismo `resolveByToken` que el
  // RSVP: la regla de qué enlace vale vive en un solo sitio.
  claim: claimGift({ registry: drizzleRegistryRepository, resolveGroup: (token) => guests.resolveByToken(token) }),
  release: releaseGift({ registry: drizzleRegistryRepository, resolveGroup: (token) => guests.resolveByToken(token) }),
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

export const orders = {
  place: placeOrder({ orders: drizzleOrderRepository, clock }),
  byRef: findOrderByRef({ orders: drizzleOrderRepository, clock }),
  attachProof: attachProof({
    orders: drizzleOrderRepository,
    storage: proofStorage,
    clock,
    newKey: () => crypto.randomUUID(),
  }),
  list: listOrders({ orders: drizzleOrderRepository, clock }),
  decide: decideOrder({ orders: drizzleOrderRepository, clock }),
  readProof: readProof({ orders: drizzleOrderRepository, storage: proofStorage, clock }),
}

export const admin = {
  users: listUsers({ admin: drizzleAdminRepository }),
  events: listAllEvents({ admin: drizzleAdminRepository }),
  metrics: readMetrics({ admin: drizzleAdminRepository }),
  audit: readAudit({ admin: drizzleAdminRepository }),
  setRole: setUserRoleUseCase({ admin: drizzleAdminRepository }),
  deleteUser: deleteUserUseCase({ admin: drizzleAdminRepository }),
  setEventPlan: setEventPlanUseCase({ admin: drizzleAdminRepository }),
  record: recordAdminAction({ admin: drizzleAdminRepository }),
  planSlugs: () => drizzleAdminRepository.listPlanSlugs(),
  /** El alta la hace el admin: no hay registro público. */
  createUser: async (input: { email: string; password: string; role: Role }) => {
    const passwordHash = await argon2Hasher.hash(input.password)
    return drizzleUserRepository.create({ email: input.email, passwordHash, role: input.role })
  },
  findUserByEmail: (email: string) => drizzleUserRepository.findByEmail(email),
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
}

const qrDeps = { qr: drizzleQrRepository, ids: () => crypto.randomUUID(), clock }

export const qr = {
  list: listEventQrCodes(qrDeps),
  create: createEventQrCode(qrDeps),
  update: updateEventQrCode(qrDeps),
  toggle: toggleEventQrCode(qrDeps),
  /** Lo usa la ruta pública `/r/<id>`: sin sesión, como el enlace del invitado. */
  resolve: resolveQrCode(qrDeps),
}

export const reminders = {
  due: listDueReminders({ reminders: drizzleReminderRepository, clock }),
  markSent: markReminderSent({ reminders: drizzleReminderRepository, clock }),
}

export const guestbook = {
  list: listGuestbook({ guestbook: drizzleGuestbookRepository }),
  markRead: markRead({ guestbook: drizzleGuestbookRepository, clock }),
  toggleFeatured: toggleFeatured({ guestbook: drizzleGuestbookRepository, clock }),
  reply: replyToMessage({ guestbook: drizzleGuestbookRepository, clock }),

  // Lo único que el invitado usa, y es de solo lectura.
  replyForGroup: getGuestReply({ guestbook: drizzleGuestbookRepository }),
} as const

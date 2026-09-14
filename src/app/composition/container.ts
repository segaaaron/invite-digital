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
import {
  clearContent,
  contentFor,
  saveContentBlock,
  seedContentForTheme,
} from '@/modules/events/application/content-use-cases'
import {
  listGuestPhotos,
  listMedia,
  purgeMedia,
  readMedia,
  saveGuestPhoto,
  saveMedia,
} from '@/modules/events/application/media-use-cases'
import { drizzleAccessRepository } from '@/modules/events/infrastructure/drizzle-access-repository'
import { listEvents } from '@/modules/events/application/list-events'
import { updateEventUseCase } from '@/modules/events/application/update-event'
import { drizzleClientShareRepository } from '@/modules/events/infrastructure/drizzle-client-share-repository'
import { drizzleContentRepository } from '@/modules/events/infrastructure/drizzle-content-repository'
import { createDiskMediaStorage } from '@/modules/events/infrastructure/disk-media-storage'
import { drizzleMediaRepository } from '@/modules/events/infrastructure/drizzle-media-repository'
import { sharpImageProcessor } from '@/modules/events/infrastructure/sharp-image-processor'
import { ffmpegAudioProcessor } from '@/shared/audio/ffmpeg-audio-processor'
import { drizzleEventRepository } from '@/modules/events/infrastructure/drizzle-event-repository'
import { drizzleStaffRepository } from '@/modules/events/infrastructure/drizzle-staff-repository'
import { adjustArrival } from '@/modules/checkin/application/adjust-arrival'
import { checkInByGroup } from '@/modules/checkin/application/check-in-by-group'
import { checkInByScan } from '@/modules/checkin/application/check-in-by-scan'
import { getDoorManifest } from '@/modules/checkin/application/get-door-manifest'
import { addPorter, enterWithPin, listPorters, resolvePorter, revokePorter } from '@/modules/checkin/application/porter-use-cases'
import { drizzlePorterStore } from '@/modules/checkin/infrastructure/drizzle-porter-store'
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
  readIncome,
  readToday,
  recordAdminAction,
  setEventPlan as setEventPlanUseCase,
  setUserRole as setUserRoleUseCase,
} from '@/modules/admin/application/admin-use-cases'
import {
  readPaymentSettings,
  savePaymentQr,
  savePaymentSettings,
} from '@/modules/admin/application/payment-use-cases'
import {
  readShowcaseMusic,
  readShowcaseSongs,
  removeShowcaseMusic,
  renameShowcaseSong,
  saveShowcaseMusic,
} from '@/modules/admin/application/showcase-music-use-cases'
import { createDiskShowcaseStorage } from '@/modules/admin/infrastructure/disk-showcase-storage'
import { drizzleAdminRepository } from '@/modules/admin/infrastructure/drizzle-admin-repository'
import { drizzleTodayReader } from '@/modules/admin/infrastructure/drizzle-today-reader'
import { drizzleCatalogAdmin } from '@/modules/admin/infrastructure/drizzle-catalog-admin'
import { drizzleIncomeReader } from '@/modules/admin/infrastructure/drizzle-income-reader'
import { drizzleSiteSettingsStore } from '@/modules/admin/infrastructure/drizzle-site-settings-store'
import {
  listSiteVersions,
  readSiteSettings,
  restoreSiteVersion,
  saveSiteSettings,
} from '@/modules/admin/application/site-settings-use-cases'
import { DEFAULT_SITE_SETTINGS, formatoWhatsapp } from '@/modules/admin/domain/site-settings'
import { cache } from 'react'
import {
  listPlansForAdmin,
  readPublication,
  savePlan as savePlanUseCase,
  setTemplatePublished as setTemplatePublishedUseCase,
} from '@/modules/admin/application/catalog-use-cases'
import { CATALOG_LISTOS } from '@/shared/design/theme-catalog'
import { drizzleSettingsRepository } from '@/modules/admin/infrastructure/drizzle-settings-repository'
import { changePassword } from '@/modules/identity/application/change-password'
import {
  confirmPasswordReset,
  requestPasswordReset,
} from '@/modules/identity/application/password-reset-use-cases'
import { drizzlePasswordResetRepository } from '@/modules/identity/infrastructure/drizzle-password-reset-repository'
import { clientAccessEmail, passwordResetEmail } from '@/modules/notifications'
import { createResendSender } from '@/modules/notifications/infrastructure/resend-sender'
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
import {
  anonymizeExpiredConsultations,
  countNewConsultations,
  listConsultations,
  moveConsultation,
} from '@/modules/leads/application/inbox-use-cases'
import { drizzleConsultationInbox } from '@/modules/leads/infrastructure/drizzle-consultation-inbox'

export const catalog = {
  listPlans: listPlans({ plans: drizzlePlanRepository }),
  listTemplates: listTemplates({ templates: drizzleTemplateRepository }),
  listCategories: listCategories({ categories: drizzleCategoryRepository }),
} as const

export const leads = {
  submitConsultation: submitConsultation({ requests: drizzleConsultationRepository, clock: () => new Date() }),
  /** La bandeja del admin: lo que llega del formulario de la web. */
  list: listConsultations({ inbox: drizzleConsultationInbox }),
  countNew: countNewConsultations({ inbox: drizzleConsultationInbox }),
  move: moveConsultation({ inbox: drizzleConsultationInbox, clock: () => new Date() }),
  anonymizeExpired: anonymizeExpiredConsultations({ inbox: drizzleConsultationInbox, clock: () => new Date() }),
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
  /**
   * Cambiar la propia contraseña. Las cuentas las da de alta otro y la clave inicial viaja
   * por WhatsApp: sin esto, la que escribió otra persona vale para siempre.
   */
  changePassword: changePassword({
    users: drizzleUserRepository,
    sessions: drizzleSessionRepository,
    hasher: argon2Hasher,
  }),
  /**
   * La recuperación por código.
   *
   * `request` devuelve el código en claro **una sola vez**, para que la acción lo mande
   * por correo: en la base solo queda su SHA-256, igual que los tokens de sesión.
   */
  requestPasswordReset: requestPasswordReset({
    users: drizzleUserRepository,
    resets: drizzlePasswordResetRepository,
    minter,
    clock,
  }),
  confirmPasswordReset: confirmPasswordReset({
    users: drizzleUserRepository,
    resets: drizzlePasswordResetRepository,
    sessions: drizzleSessionRepository,
    hasher: argon2Hasher,
    minter,
    clock,
  }),
} as const

const mediaDeps = {
  media: drizzleMediaRepository,
  storage: createDiskMediaStorage(env.EVENT_MEDIA_DIR),
  // Lo que llega al disco es ya lo que se va a servir: reducido, reencodado y sin
  // metadatos. No hay una versión pesada esperando a que alguien la pida.
  images: sharpImageProcessor,
  // La música, igual: se convierte en un MP3 ligero y se recorta al subirla.
  audio: ffmpegAudioProcessor,
  ids: () => crypto.randomUUID(),
}

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
   * El contenido rico de la invitación: lo que los dieciséis diseños pintan y `events` no
   * guarda. `contentFor` no escribe —una invitación se abre cientos de veces—; quien
   * escribe es `seedContent`, al crear el evento o al cambiar de diseño.
   */
  contentFor: contentFor(drizzleContentRepository),
  saveContentBlock: saveContentBlock(drizzleContentRepository),
  seedContent: seedContentForTheme(drizzleContentRepository),
  clearContent: clearContent(drizzleContentRepository),
  /**
   * Las imágenes de la invitación. El fichero vive en disco fuera de `public/`; la fila,
   * en Postgres. Las entrega `GET /media/[id]` con la puerta de contraseña del evento.
   */
  media: {
    save: saveMedia(mediaDeps),
    read: readMedia(mediaDeps),
    list: listMedia(mediaDeps),
    purge: purgeMedia(mediaDeps),
    /** Lo que sube el invitado desde su invitación, con el tope por grupo dentro. */
    saveFromGuest: saveGuestPhoto(mediaDeps),
    listOfGuest: listGuestPhotos(mediaDeps),
  },
  /**
   * Quién pertenece a un evento sin ser su dueño: el personal de puerta y el cliente.
   * Vive aquí y no en un módulo propio porque es una pertenencia del evento, no una
   * entidad con vida propia.
   *
   * La clase viaja explícita en cada llamada. Un valor por omisión aquí sería el sitio
   * exacto donde un cliente acabaría con el check-in de una boda.
   */
  staff: {
    add: (eventId: string, userId: string, membership: 'puerta' | 'cliente') =>
      drizzleStaffRepository.add(eventId, userId, membership),
    remove: (eventId: string, userId: string) => drizzleStaffRepository.remove(eventId, userId),
    /** Los dos tipos a la vez: lo usa el borrado del evento. */
    listUserIds: (eventId: string) => drizzleStaffRepository.listUserIds(eventId),
    listWithEmail: (eventId: string, membership: 'puerta' | 'cliente') =>
      drizzleStaffRepository.listWithEmail(eventId, membership),
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
    clearContentForEvent: clearContent(drizzleContentRepository),
    purgeMediaForEvent: purgeMedia(mediaDeps),
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
  void: voidArrival({ arrivals: drizzleArrivalRepository, groups: drizzleDoorGroupReader, clock }),
  manifest: getDoorManifest({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository }),
  state: getDoorState({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository }),
} as const

/**
 * Los porteros: la gente de la puerta que suma quien compró el evento, sin cuenta. Entran
 * con enlace y PIN y el servidor vuelve a comprobarlos en cada petición.
 */
const aleatorio = (n: number) => crypto.getRandomValues(new Uint8Array(n))
export const porters = {
  add: addPorter({ porters: drizzlePorterStore, minter, clock, random: aleatorio }),
  list: listPorters({ porters: drizzlePorterStore }),
  revoke: revokePorter({ porters: drizzlePorterStore, clock }),
  enter: enterWithPin({ porters: drizzlePorterStore, minter, clock, random: aleatorio }),
  resolve: resolvePorter({ porters: drizzlePorterStore, minter, clock }),
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

/**
 * La música de los modelos del escaparate, en su propia carpeta dentro del volumen de
 * medios. Separada de los comprobantes a propósito: son datos de distinta naturaleza y con
 * distinta vida, y limpiar lo uno no puede llevarse lo otro.
 */
const showcaseStorage = createDiskShowcaseStorage(`${env.EVENT_MEDIA_DIR}/escaparate`)

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

/**
 * El correo saliente.
 *
 * `sendClientAccess` compone y entrega de una vez: quien lo llama está dando de alta a un
 * cliente y no tiene por qué saber cómo se redacta. **Devuelve un booleano y no lanza**,
 * así que un fallo del proveedor no puede tumbar el alta — la cuenta ya está creada y la
 * contraseña se sigue enseñando en pantalla, que es como se repartía antes de haber correo.
 */
const sitioPublicoUrl = env.SITE_URL.replace(/\/+$/, '')
const emailSender = createResendSender({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM })

const leerSitio = readSiteSettings({ settings: drizzleSettingsRepository })

/**
 * «La web» para quien la pinta: una lectura **por petición** —el pie, la portada y el
 * marcado de Google la piden en la misma respuesta— y, si la base no responde, los valores
 * por defecto. Un fallo de ajustes no puede tumbar la web: se registra y se sigue.
 */
export const site = {
  settings: cache(async () => {
    const leido = await leerSitio()
    if (!leido.ok) console.error('«La web» no se pudo leer; se usan los valores por defecto:', leido.error.detail)
    return leido.ok ? leido.value : DEFAULT_SITE_SETTINGS
  }),
}

export const notifications = {
  /** El código de recuperación. Sin enlace dentro: se teclea donde ya se pidió el cambio. */
  sendPasswordCode: async (input: { to: string; code: string }) =>
    emailSender.send({
      to: input.to,
      ...passwordResetEmail({
        code: input.code,
        minutos: 10,
        whatsapp: formatoWhatsapp((await site.settings()).whatsapp) || null,
        siteUrl: sitioPublicoUrl,
      }),
    }),
  sendClientAccess: async (input: { to: string; password: string | null; eventTitle: string }) =>
    emailSender.send({
      to: input.to,
      ...clientAccessEmail({
        email: input.to,
        password: input.password,
        eventTitle: input.eventTitle,
        panelUrl: `${sitioPublicoUrl}/panel/entrar`,
        siteUrl: sitioPublicoUrl,
        whatsapp: formatoWhatsapp((await site.settings()).whatsapp) || null,
      }),
    }),
} as const

export const admin = {
  users: listUsers({ admin: drizzleAdminRepository }),
  events: listAllEvents({ admin: drizzleAdminRepository }),
  metrics: readMetrics({ admin: drizzleAdminRepository }),
  today: readToday({ today: drizzleTodayReader, clock: () => new Date() }),
  income: readIncome({ income: drizzleIncomeReader, clock: () => new Date() }),
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
    conocidos: () => CATALOG_LISTOS.map((entrada) => entrada.key),
  }),
  audit: readAudit({ admin: drizzleAdminRepository }),
  setRole: setUserRoleUseCase({ admin: drizzleAdminRepository }),
  deleteUser: deleteUserUseCase({ admin: drizzleAdminRepository }),
  setEventPlan: setEventPlanUseCase({ admin: drizzleAdminRepository }),
  record: recordAdminAction({ admin: drizzleAdminRepository }),
  planSlugs: () => drizzleAdminRepository.listPlanSlugs(),
  planOptions: () => drizzleAdminRepository.listPlanOptions(),
  setUserPlan: (userId: string, planSlug: string | null) => drizzleAdminRepository.setUserPlan(userId, planSlug),
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

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
import { listEvents } from '@/modules/events/application/list-events'
import { updateEventUseCase } from '@/modules/events/application/update-event'
import { drizzleClientShareRepository } from '@/modules/events/infrastructure/drizzle-client-share-repository'
import { drizzleEventRepository } from '@/modules/events/infrastructure/drizzle-event-repository'
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
import { addGuestGroup } from '@/modules/guests/application/add-guest-group'
import { listGuestGroups } from '@/modules/guests/application/list-guest-groups'
import { resolveByToken } from '@/modules/guests/application/resolve-by-token'
import { revokeInvitation } from '@/modules/guests/application/revoke-invitation'
import { drizzleGuestGroupRepository } from '@/modules/guests/infrastructure/drizzle-guest-group-repository'
import { getInvitation } from '@/modules/rsvp/application/get-invitation'
import { getTally } from '@/modules/rsvp/application/get-tally'
import { respondToInvitation } from '@/modules/rsvp/application/respond-to-invitation'
import { drizzleRsvpRepository } from '@/modules/rsvp/infrastructure/drizzle-rsvp-repository'
import { authenticateSession } from '@/modules/identity/application/authenticate-session'
import { signIn } from '@/modules/identity/application/sign-in'
import { signOut } from '@/modules/identity/application/sign-out'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { drizzleSessionRepository } from '@/modules/identity/infrastructure/drizzle-session-repository'
import { drizzleUserRepository } from '@/modules/identity/infrastructure/drizzle-user-repository'
import { createTokenMinter } from '@/shared/security/tokens'
import { getTemplate } from '@/modules/catalog/application/get-template'
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
  getTemplate: getTemplate({ templates: drizzleTemplateRepository }),
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
} as const

export const events = {
  create: createEventUseCase({ events: drizzleEventRepository, ids: () => crypto.randomUUID() }),
  update: updateEventUseCase({ events: drizzleEventRepository }),
  list: listEvents({ events: drizzleEventRepository }),
  getBySlug: getEventBySlug({ events: drizzleEventRepository }),
  getById: getEventById({ events: drizzleEventRepository }),
  createShare: createClientShare({ shares: drizzleClientShareRepository, minter, ids: () => crypto.randomUUID(), clock }),
  revokeShare: revokeClientShare({ shares: drizzleClientShareRepository, clock }),
  liveShare: getLiveClientShare({ shares: drizzleClientShareRepository, clock }),
  resolveShare: resolveClientShare({ shares: drizzleClientShareRepository, events: drizzleEventRepository, minter, clock }),
  runMaintenance: anonymizeExpiredEvents({
    events: drizzleEventRepository,
    deleteExpiredSessions: (now) => drizzleSessionRepository.deleteExpired(now),
    clock,
  }),
} as const

export const guests = {
  add: addGuestGroup({ groups: drizzleGuestGroupRepository, minter, ids: () => crypto.randomUUID() }),
  list: listGuestGroups({ groups: drizzleGuestGroupRepository }),
  revoke: revokeInvitation({ groups: drizzleGuestGroupRepository, clock }),
  resolveByToken: resolveByToken({ groups: drizzleGuestGroupRepository, minter, clock }),
} as const

export const rsvp = {
  respond: respondToInvitation({
    resolveGroup: (token) => guests.resolveByToken(token),
    findEventById: (id) => events.getById(id),
    rsvp: drizzleRsvpRepository,
    ids: () => crypto.randomUUID(),
    clock,
  }),
  tally: getTally({ rsvp: drizzleRsvpRepository }),
  getInvitation: getInvitation({
    resolveGroup: (token) => guests.resolveByToken(token),
    findEventById: (id) => events.getById(id),
    rsvp: drizzleRsvpRepository,
  }),
  latestFor: (guestGroupId: string) => drizzleRsvpRepository.latestFor(guestGroupId),
} as const

export const checkin = {
  record: checkInByScan({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository, minter }),
  recordGroup: checkInByGroup({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository }),
  adjust: adjustArrival({ arrivals: drizzleArrivalRepository, groups: drizzleDoorGroupReader }),
  void: voidArrival({ arrivals: drizzleArrivalRepository, clock }),
  manifest: getDoorManifest({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository }),
  state: getDoorState({ groups: drizzleDoorGroupReader, arrivals: drizzleArrivalRepository }),
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
export const guestbook = {
  list: listGuestbook({ guestbook: drizzleGuestbookRepository }),
  markRead: markRead({ guestbook: drizzleGuestbookRepository, clock }),
  toggleFeatured: toggleFeatured({ guestbook: drizzleGuestbookRepository, clock }),
  reply: replyToMessage({ guestbook: drizzleGuestbookRepository, clock }),

  // Lo único que el invitado usa, y es de solo lectura.
  replyForGroup: getGuestReply({ guestbook: drizzleGuestbookRepository }),
} as const

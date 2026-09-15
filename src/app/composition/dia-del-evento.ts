import { enExclusiva } from '@/shared/db/candado'
import { adjustArrival } from '@/modules/checkin/application/adjust-arrival'
import { checkInByGroup } from '@/modules/checkin/application/check-in-by-group'
import { checkInByScan } from '@/modules/checkin/application/check-in-by-scan'
import { getDoorManifest } from '@/modules/checkin/application/get-door-manifest'
import { addPorter, enterWithPin, listPorters, porterActivity, resolvePorter, revokePorter } from '@/modules/checkin/application/porter-use-cases'
import { createDrizzlePorterStore, drizzlePorterStore } from '@/modules/checkin/infrastructure/drizzle-porter-store'
import { getDoorState } from '@/modules/checkin/application/get-door-state'
import { voidArrival } from '@/modules/checkin/application/void-arrival'
import { drizzleArrivalRepository, drizzleDoorGroupReader } from '@/modules/checkin/infrastructure/drizzle-arrival-repository'
import { assignGroup, autoAssignGroups, unassignGroup } from '@/modules/venue/application/assign-use-cases'
import { listSeating } from '@/modules/venue/application/list-seating'
import { moveElements } from '@/modules/venue/application/move-element'
import { addTable, removeTable, updateTable } from '@/modules/venue/application/table-use-cases'
import { addZone, removeZone, updateZone } from '@/modules/venue/application/zone-use-cases'
import { drizzleVenueRepository } from '@/modules/venue/infrastructure/drizzle-venue-repository'
import { claimGift, releaseGift } from '@/modules/registry/application/claim-gift'
import { addFund, recordContribution, removeFund, updateFund } from '@/modules/registry/application/fund-use-cases'
import { addGift, markPurchased, releaseGiftAsAtelier, removeGift, updateGift } from '@/modules/registry/application/gift-use-cases'
import { listRegistry } from '@/modules/registry/application/list-registry'
import { drizzleRegistryRepository } from '@/modules/registry/infrastructure/drizzle-registry-repository'
import { createEventQrCode, listEventQrCodes, resolveQrCode, toggleEventQrCode, updateEventQrCode } from '@/modules/qr/application/qr-use-cases'
import { drizzleQrRepository } from '@/modules/qr/infrastructure/drizzle-qr-repository'
import { guests } from './eventos'
import { clock, minter } from './base'

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
  // Contar y sumar con candado por evento: dos altas a la vez no se pasan del cupo del plan.
  add: (input: Parameters<ReturnType<typeof addPorter>>[0]) =>
    enExclusiva(`porteros:${input.eventId}`, (tx) => addPorter({ porters: createDrizzlePorterStore(tx), minter, clock, random: aleatorio })(input)),
  list: listPorters({ porters: drizzlePorterStore }),
  activity: porterActivity({ porters: drizzlePorterStore }),
  revoke: revokePorter({ porters: drizzlePorterStore, clock }),
  enter: enterWithPin({ porters: drizzlePorterStore, minter, clock, random: aleatorio }),
  resolve: resolvePorter({ porters: drizzlePorterStore, minter, clock }),
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

const qrDeps = { qr: drizzleQrRepository, ids: () => crypto.randomUUID(), clock }

export const qr = {
  list: listEventQrCodes(qrDeps),
  create: createEventQrCode(qrDeps),
  update: updateEventQrCode(qrDeps),
  toggle: toggleEventQrCode(qrDeps),
  /** Lo usa la ruta pública `/r/<id>`: sin sesión, como el enlace del invitado. */
  resolve: resolveQrCode(qrDeps),
}

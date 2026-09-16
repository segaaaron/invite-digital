import { enExclusiva } from '@/shared/db/candado'
import { enTransaccion } from '@/shared/db/transaccion'
import { db, type DbExecutor } from '@/shared/db/client'
import { createClientShare, getLiveClientShare, resolveClientShare, revokeClientShare } from '@/modules/events/application/client-share-use-cases'
import { anonymizeExpiredEvents } from '@/modules/events/application/anonymize-expired-events'
import { randomBytes } from 'node:crypto'
import { fiestaDeTema } from '@/modules/events/domain/fiesta'
import { addTeamMember, removeTeamMember } from '@/modules/events/application/team-use-cases'
import type { Membership } from '@/modules/identity'
import * as diaUseCases from '@/modules/planner/application/dia-use-cases'
import * as plannerUseCases from '@/modules/planner/application/planner-use-cases'
import { drizzleDiaStore } from '@/modules/planner/infrastructure/drizzle-dia-store'
import { drizzlePlannerStore } from '@/modules/planner/infrastructure/drizzle-planner-store'
import { createEventUseCase } from '@/modules/events/application/create-event'
import { getEventById, getEventBySlug } from '@/modules/events/application/get-event'
import { actorCanTouchEvent, getEventByIdFor, getEventFor, listEventsFor } from '@/modules/events/application/tenancy'
import { deleteEvent } from '@/modules/events/application/delete-event'
import { checkEventPassword, setEventPassword } from '@/modules/events/application/event-access'
import { clearContent, contentFor, saveContentBlock, seedEmptyContent } from '@/modules/events/application/content-use-cases'
import { listGuestPhotos, listMedia, purgeMedia, readMedia, removeMedia, saveGuestPhoto, saveMedia } from '@/modules/events/application/media-use-cases'
import { drizzleAccessRepository } from '@/modules/events/infrastructure/drizzle-access-repository'
import { listEvents } from '@/modules/events/application/list-events'
import { updateEventUseCase } from '@/modules/events/application/update-event'
import { drizzleClientShareRepository } from '@/modules/events/infrastructure/drizzle-client-share-repository'
import { drizzleContentRepository } from '@/modules/events/infrastructure/drizzle-content-repository'
import { createDiskMediaStorage } from '@/modules/events/infrastructure/disk-media-storage'
import { drizzleMediaRepository } from '@/modules/events/infrastructure/drizzle-media-repository'
import { sharpImageProcessor } from '@/modules/events/infrastructure/sharp-image-processor'
import { ffmpegAudioProcessor } from '@/shared/audio/ffmpeg-audio-processor'
import { drizzleEventRepository, publicarSiBorrador } from '@/modules/events/infrastructure/drizzle-event-repository'
import { createDrizzleStaffRepository, drizzleStaffRepository } from '@/modules/events/infrastructure/drizzle-staff-repository'
import { recordView } from '@/modules/analytics/application/record-view'
import { getViewTally } from '@/modules/analytics/application/get-view-tally'
import { drizzleViewRepository } from '@/modules/analytics/infrastructure/drizzle-view-repository'
import { getGuestReply, listGuestbook, markRead, replyToMessage, toggleFeatured } from '@/modules/guestbook/application/guestbook-use-cases'
import { countUnreadMessages, drizzleGuestbookRepository } from '@/modules/guestbook/infrastructure/drizzle-guestbook-repository'
import { sniffMime } from '@/modules/orders/domain/proof'
import { env } from '@/shared/config/env'
import { listDueReminders, markReminderSent } from '@/modules/reminders/application/reminder-use-cases'
import { drizzleReminderRepository } from '@/modules/reminders/infrastructure/drizzle-reminder-repository'
import { isErr } from '@/shared/result'
import { addGuest } from '@/modules/guests/application/add-guest'
import { addGuestGroup } from '@/modules/guests/application/add-guest-group'
import { listGuestGroups } from '@/modules/guests/application/list-guest-groups'
import { importGuestGroups } from '@/modules/guests/application/import-guest-groups'
import { resendInvitation } from '@/modules/guests/application/resend-invitation'
import { addPerson, listPeopleByEvent, removePerson, updatePerson } from '@/modules/guests/application/person-use-cases'
import { countPeopleByEvent, createDrizzleGuestPersonRepository, drizzleGuestPersonRepository } from '@/modules/guests/infrastructure/drizzle-guest-person-repository'
import { resolveByToken } from '@/modules/guests/application/resolve-by-token'
import { reopenRsvp, revokeInvitation } from '@/modules/guests/application/revoke-invitation'
import { countGroupsByEvent, createDrizzleGuestGroupRepository, drizzleGuestGroupRepository } from '@/modules/guests/infrastructure/drizzle-guest-group-repository'
import { getInvitation } from '@/modules/rsvp/application/get-invitation'
import { getEventStats } from '@/modules/rsvp/application/get-event-stats'
import { getTally } from '@/modules/rsvp/application/get-tally'
import { getRsvpTimeline } from '@/modules/rsvp/application/get-rsvp-timeline'
import { respondToInvitation } from '@/modules/rsvp/application/respond-to-invitation'
import { respondByPerson } from '@/modules/rsvp/application/respond-by-person'
import { drizzleRsvpRepository } from '@/modules/rsvp/infrastructure/drizzle-rsvp-repository'
import { argon2Hasher } from '@/modules/identity/infrastructure/argon2-hasher'
import { drizzleSessionRepository } from '@/modules/identity/infrastructure/drizzle-session-repository'
import { createDrizzleUserRepository } from '@/modules/identity/infrastructure/drizzle-user-repository'
import { clock, minter } from './base'

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

/** El planner de cada evento: plan de tareas y presupuesto. */
const plannerDeps = { store: drizzlePlannerStore, clock }

const diaDeps = {
  dia: drizzleDiaStore,
  store: drizzlePlannerStore,
  minter,
  // Los documentos del planner, en su carpeta del mismo volumen privado que las fotografías.
  archivos: createDiskMediaStorage(`${env.EVENT_MEDIA_DIR}/documentos`),
  sniff: sniffMime,
  ids: () => crypto.randomUUID(),
  clock,
}

export const planner = {
  listTasks: (eventId: string) => drizzlePlannerStore.listTasks(eventId),
  seedTasks: plannerUseCases.seedTasks(plannerDeps),
  addTask: plannerUseCases.addTask(plannerDeps),
  editTask: plannerUseCases.editTask(plannerDeps),
  toggleTask: plannerUseCases.toggleTask(plannerDeps),
  removeTask: plannerUseCases.removeTask(plannerDeps),
  moveTask: plannerUseCases.moveTask(plannerDeps),
  listBudget: (eventId: string) => drizzlePlannerStore.listBudget(eventId),
  saveItem: plannerUseCases.saveItem(plannerDeps),
  removeItem: plannerUseCases.removeItem(plannerDeps),
  addPayment: plannerUseCases.addPayment(plannerDeps),
  setPaymentPaid: plannerUseCases.setPaymentPaid(plannerDeps),
  removePayment: plannerUseCases.removePayment(plannerDeps),
  /** El día del evento: proveedores, cronograma, cortejo y ensayos. */
  dia: {
    listVendors: (eventId: string) => drizzleDiaStore.listVendors(eventId),
    saveVendor: diaUseCases.saveVendor(diaDeps),
    setVendorStatus: diaUseCases.setVendorStatus(diaDeps),
    removeVendor: diaUseCases.removeVendor(diaDeps),
    emitVendorLink: diaUseCases.emitirEnlaceDeProveedor(diaDeps),
    revokeVendorLink: diaUseCases.quitarEnlaceDeProveedor(diaDeps),
    viewAsVendor: diaUseCases.verComoProveedor(diaDeps),
    listMoments: (eventId: string) => drizzleDiaStore.listMoments(eventId),
    seedMoments: diaUseCases.seedMoments(diaDeps),
    saveMoment: diaUseCases.saveMoment(diaDeps),
    removeMoment: diaUseCases.removeMoment(diaDeps),
    listCourt: (eventId: string) => drizzleDiaStore.listCourt(eventId),
    saveCourtMember: diaUseCases.saveCourtMember(diaDeps),
    setCourtConfirmed: diaUseCases.setCourtConfirmed(diaDeps),
    removeCourtMember: diaUseCases.removeCourtMember(diaDeps),
    listRehearsals: (eventId: string) => drizzleDiaStore.listRehearsals(eventId),
    saveRehearsal: diaUseCases.saveRehearsal(diaDeps),
    removeRehearsal: diaUseCases.removeRehearsal(diaDeps),
    setVendorArrived: diaUseCases.setVendorArrived(diaDeps),
    listDocuments: (eventId: string) => drizzleDiaStore.listDocuments(eventId),
    saveDocument: diaUseCases.saveDocument(diaDeps),
    readDocument: diaUseCases.readDocument(diaDeps),
    removeDocument: diaUseCases.removeDocument(diaDeps),
    purgeDocuments: diaUseCases.purgeDocuments(diaDeps),
  },
} as const

export const events = {
  /**
   * Crear un evento siembra su plan de tareas con la plantilla de su fiesta. Va aquí, y no
   * en cada acción, porque se crea desde tres sitios —el atelier, el alta del admin y el
   * pedido aprobado— y olvidarlo en uno dejaría eventos sin plan. Si sembrar falla, el
   * evento se crea igual: la pantalla de tareas ofrece sembrarlas a mano.
   */
  create: async (input: Parameters<ReturnType<typeof createEventUseCase>>[0]) => {
    const creado = await createEventUseCase({ events: drizzleEventRepository, ids: () => crypto.randomUUID() })(input)
    if (!isErr(creado)) {
      await planner.seedTasks(creado.value.id, fiestaDeTema(creado.value.themeKey), creado.value.eventDate).catch((cause: unknown) => {
        console.error('No se pudo sembrar el plan de tareas del evento %s:', creado.value.id, cause)
      })
    }
    return creado
  },
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
  /** Al preparar un enlace: la invitación sale publicada, sin que nadie la apruebe. */
  publicarSiBorrador: (eventId: string) => publicarSiBorrador(db, eventId),
  /**
   * El contenido rico de la invitación: lo que los dieciséis diseños pintan y `events` no
   * guarda. `contentFor` no escribe —una invitación se abre cientos de veces—; quien
   * escribe es `seedContent`, al crear el evento: deja la fila **vacía**, que es distinto de
   * no tener fila. El contenido de muestra del diseño se usa solo como ejemplo en el editor.
   */
  contentFor: contentFor(drizzleContentRepository),
  saveContentBlock: saveContentBlock(drizzleContentRepository),
  seedContent: seedEmptyContent(drizzleContentRepository),
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
    remove: removeMedia(mediaDeps),
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
    listWithEmail: (eventId: string, membership: Membership) => drizzleStaffRepository.listWithEmail(eventId, membership),
    hostsOf: (eventIds: readonly string[]) => drizzleStaffRepository.hostsOf(eventIds),
    membershipsOf: (eventId: string, userId: string) => drizzleStaffRepository.membershipsOf(eventId, userId),
    eventIdsOf: (userId: string, memberships: readonly Membership[]) => drizzleStaffRepository.eventIdsOf(userId, memberships),
  },
  /**
   * El equipo que suma el anfitrión: co-anfitriones y planner. Una cuenta nueva nace de
   * cliente con contraseña provisional; una que ya existe no se toca.
   */
  team: {
    // Contar y sumar van en una transacción con candado por evento: dos altas a la vez no se
    // pasan del tope. Y si el alta falla a medias, la cuenta nueva no se queda huérfana.
    add: (input: Parameters<ReturnType<typeof addTeamMember>>[0]) =>
      enExclusiva(`equipo:${input.eventId}`, (tx) => {
        const users = createDrizzleUserRepository(tx)
        return addTeamMember({
          staff: createDrizzleStaffRepository(tx),
          users: {
            findByEmail: async (email) => {
              const usuario = await users.findByEmail(email)
              if (usuario === null) return null
              return { id: usuario.id, role: (await users.findActor(usuario.id))?.role ?? 'atelier' }
            },
            create: async ({ email, password, role }) => users.create({ email, passwordHash: await argon2Hasher.hash(password), role }),
          },
          password: () => randomBytes(12).toString('base64url'),
        })(input)
      }),
    remove: removeTeamMember({ staff: drizzleStaffRepository }),
    list: (eventId: string) => drizzleStaffRepository.listTeam(eventId),
  },
  remove: deleteEvent({
    events: drizzleEventRepository,
    purgeFiles: async (eventId) => (await purgeMedia(mediaDeps)(eventId)) + (await planner.dia.purgeDocuments(eventId)),
  }),
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
    // Las fotografías y los documentos privados del planner: los dos son ficheros del evento.
    purgeMediaForEvent: async (eventId) => (await purgeMedia(mediaDeps)(eventId)) + (await planner.dia.purgeDocuments(eventId)),
    clock,
  }),
} as const

/**
 * Los repositorios de invitados atados a una conexión: la de siempre o la de una transacción.
 * Lo que escribe más de una fila —alta, baja, mover, importar— corre en `enTransaccion`, que
 * deshace también cuando el caso de uso devuelve un error: una invitación a medias, o vacía
 * porque su última persona se fue y la baja de la invitación falló, no llega a la base.
 */
const invitadosEn = (database: DbExecutor) => {
  const groups = createDrizzleGuestGroupRepository(database)
  const people = createDrizzleGuestPersonRepository(database)
  const ids = () => crypto.randomUUID()
  const altaDeGrupo = addGuestGroup({ groups, minter, ids, clock })
  const altaDePersona = addPerson({ groups, people, ids })
  return {
    groups,
    addPerson: altaDePersona,
    updatePerson: updatePerson({ groups, people }),
    removePerson: removePerson({ groups, people }),
    importCsv: importGuestGroups({ groups, people, minter, ids, clock }),
    addGuest: addGuest({
      addGroup: async (input) => {
        const r = await altaDeGrupo(input)
        return isErr(r) ? { ok: false, message: r.error.detail } : { ok: true, group: r.value.group, token: r.value.token }
      },
      setPhone: (eventId, groupId, phone) => groups.setPhone(eventId, groupId, phone),
      addPerson: async (input) => {
        const r = await altaDePersona(input)
        return isErr(r) ? { ok: false, message: r.error.detail, kind: r.error.kind } : { ok: true }
      },
    }),
  }
}

export const guests = {
  list: listGuestGroups({ groups: drizzleGuestGroupRepository }),
  /** Cuántas invitaciones, sin traerlas: el tope del plan se cuenta en invitaciones. */
  contar: (eventId: string) => countGroupsByEvent(db, eventId),
  /** Cuántas personas, para la insignia de «Invitados» de la barra. */
  contarPersonas: (eventId: string) => countPeopleByEvent(eventId),
  resolveByToken: resolveByToken({ groups: drizzleGuestGroupRepository, minter, clock }),
  listPeople: listPeopleByEvent({ people: drizzleGuestPersonRepository }),
  revoke: revokeInvitation({ groups: drizzleGuestGroupRepository, clock }),
  reopenRsvp: reopenRsvp({ groups: drizzleGuestGroupRepository, clock }),
  resend: resendInvitation({ groups: drizzleGuestGroupRepository, minter, clock }),
  setPhone: (eventId: string, id: string, phone: string | null) => drizzleGuestGroupRepository.setPhone(eventId, id, phone),
  addGuest: (input: Parameters<ReturnType<typeof invitadosEn>['addGuest']>[0]) => enTransaccion((tx) => invitadosEn(tx).addGuest(input)),
  addPerson: (input: Parameters<ReturnType<typeof invitadosEn>['addPerson']>[0]) => enTransaccion((tx) => invitadosEn(tx).addPerson(input)),
  updatePerson: (input: Parameters<ReturnType<typeof invitadosEn>['updatePerson']>[0]) => enTransaccion((tx) => invitadosEn(tx).updatePerson(input)),
  removePerson: (input: Parameters<ReturnType<typeof invitadosEn>['removePerson']>[0]) => enTransaccion((tx) => invitadosEn(tx).removePerson(input)),
  importCsv: (input: Parameters<ReturnType<typeof invitadosEn>['importCsv']>[0]) => enTransaccion((tx) => invitadosEn(tx).importCsv(input)),
} as const

export const rsvp = {
  respond: respondToInvitation({
    resolveGroup: (token) => guests.resolveByToken(token),
    findEventById: (id) => events.getByIdUnscoped(id),
    rsvp: drizzleRsvpRepository,
    ids: () => crypto.randomUUID(),
    clock,
  }),
  /** La confirmación nombre por nombre, para los grupos con personas cargadas. */
  respondByPerson: respondByPerson({
    resolveGroup: (token) => guests.resolveByToken(token),
    findEventById: (id) => events.getByIdUnscoped(id),
    peopleOf: (guestGroupId) => drizzleGuestPersonRepository.listByGroup(guestGroupId),
    setAttendance: async (eventId, personId, attending) => {
      await guests.updatePerson({ eventId, id: personId, attending })
    },
    rsvp: drizzleRsvpRepository,
    ids: () => crypto.randomUUID(),
    clock,
  }),
  /** Cuándo se reabrió la confirmación de un grupo: decide si vuelve a verse el formulario. */
  reopenedAtFor: (guestGroupId: string) => drizzleRsvpRepository.reopenedAtFor(guestGroupId),
  /** Las personas de un grupo, para la pantalla de confirmación del invitado. */
  peopleOfGroup: (guestGroupId: string) => drizzleGuestPersonRepository.listByGroup(guestGroupId),
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

export const analytics = {
  record: recordView({ views: drizzleViewRepository }),
  tally: getViewTally({ views: drizzleViewRepository, clock }),
} as const

export const reminders = {
  due: listDueReminders({ reminders: drizzleReminderRepository, clock }),
  markSent: markReminderSent({ reminders: drizzleReminderRepository, clock }),
}

export const guestbook = {
  list: listGuestbook({ guestbook: drizzleGuestbookRepository }),
  /** Cuántos sin leer, sin traer el libro: para la insignia de la barra. */
  sinLeer: (eventId: string) => countUnreadMessages(db, eventId),
  markRead: markRead({ guestbook: drizzleGuestbookRepository, clock }),
  toggleFeatured: toggleFeatured({ guestbook: drizzleGuestbookRepository, clock }),
  reply: replyToMessage({ guestbook: drizzleGuestbookRepository, clock }),

  // Lo único que el invitado usa, y es de solo lectura.
  replyForGroup: getGuestReply({ guestbook: drizzleGuestbookRepository }),
} as const

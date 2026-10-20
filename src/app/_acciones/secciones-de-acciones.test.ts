/**
 * Qué sección de permiso pide **cada** acción que se llama desde el panel de un evento (13 oct).
 *
 * Una acción sin sección hereda `full`, que el cliente, el co-anfitrión y la planner no tienen: su
 * botón acaba en «Evento no encontrado» (producción, 7 oct). La suite e2e entra casi siempre como el
 * atelier dueño, que pasa cualquier sección, así que no lo ve. Esta tabla sí: cada acción, la sección
 * que pide, y quién entra con ella lo dice `QUIEN_ENTRA` en `identity/domain/access.ts`.
 *
 * Una acción nueva, o un cambio de sección, rompe esta prueba **a propósito**: se decide quién la usa
 * y se anota aquí. «sin guardia de evento» = no pasa por `requireEventAccess` (pública, del portero
 * por su token, del admin o de la cuenta).
 */
import { beforeEach, expect, it, vi } from 'vitest'

const requireEventAccess = vi.fn()
const corte = new Error('corte')
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), updateTag: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }) }))
const cortar = (): never => {
  throw corte
}
vi.mock('next/navigation', () => ({ redirect: cortar, notFound: cortar }))
vi.mock('@/app/_acciones/sesion', () => ({
  requireSession: async () => ({ userId: 'u1', email: 'a@x.bo', role: 'cliente' }),
  requireEventAccess: (...args: unknown[]) => requireEventAccess(...args),
  requireAdmin: async () => cortar(),
}))
// La composición entera, perezosa: se puede importar y recorrer, y corta solo si algo la llama.
const perezoso = (): unknown => new Proxy(function () {}, { get: (_t, k) => (k === 'then' ? undefined : perezoso()), apply: cortar })
vi.mock('@/app/composition/container', () => new Proxy({}, { get: (_t, k) => (k === 'then' || k === '__esModule' ? undefined : perezoso()) }))
beforeEach(() => {
  requireEventAccess.mockReset()
  // Se corta en la guardia: lo que se mide es qué sección pide, no lo que hace después.
  requireEventAccess.mockRejectedValue(corte)
})

const ESPERADO: Record<string, string> = {
  'checkin/actions.adjustArrivalAction': 'checkin',
  'checkin/actions.checkInByGroupAction': 'checkin',
  'checkin/actions.recordScansAction': 'checkin',
  'checkin/actions.registrarSinPaseAction': 'checkin',
  'checkin/actions.undoCheckInAction': 'checkin',
  'checkin/actions.voidArrivalAction': 'checkin',
  'checkin/porter-actions.addPorterAction': 'porteros',
  'checkin/porter-actions.adjustArrivalAsPorterAction': 'sin guardia de evento',
  'checkin/porter-actions.checkInByGroupAsPorterAction': 'sin guardia de evento',
  'checkin/porter-actions.enterAsPorterAction': 'sin guardia de evento',
  'checkin/porter-actions.porterAccessAction': 'sin guardia de evento',
  'checkin/porter-actions.recordScansAsPorterAction': 'sin guardia de evento',
  'checkin/porter-actions.removePorterAction': 'porteros',
  'checkin/porter-actions.voidArrivalAsPorterAction': 'sin guardia de evento',
  'events/actions.aplicarTextosDelAsistenteAction': 'invitacion',
  'events/actions.createEventAction': 'sin guardia de evento',
  'events/actions.deleteEventAction': 'ficha',
  'events/actions.ponerFotoDelAsistenteAction': 'invitacion',
  'events/actions.removeMediaAction': 'invitacion',
  'events/actions.renombrarEventoAction': 'cliente',
  'events/actions.saveContentBlockAction': 'invitacion',
  'events/actions.setEventCurrencyAction': 'cliente',
  'events/actions.setEventPrivacyAction': 'ficha',
  'events/actions.unlockEventAction': 'sin guardia de evento',
  'events/actions.updateEventAction': 'ficha',
  'events/actions.uploadGuestPhotoAction': 'sin guardia de evento',
  'events/actions.uploadMediaAction': 'invitacion',
  'events/diseno-actions.aprobarVersionAction': 'equipo',
  'events/diseno-actions.empezarEncargoAction': 'sin guardia de evento',
  'events/diseno-actions.enviarADisenoAction': 'invitacion',
  'events/diseno-actions.noCuentaAction': 'sin guardia de evento',
  'events/diseno-actions.pedirCambiosAction': 'equipo',
  'events/diseno-actions.versionEnviadaAction': 'sin guardia de evento',
  'events/estilo-actions.guardarEstiloAction': 'invitacion',
  'events/save-the-date-actions.crearSaveTheDateAction': 'invitacion',
  'events/save-the-date-actions.quitarSaveTheDateAction': 'invitacion',
  'events/team-actions.addTeamMemberAction': 'equipo',
  'events/team-actions.removeTeamMemberAction': 'equipo',
  'guestbook/actions.replyAction': 'cliente',
  'guests/actions.addGuestAction': 'cliente',
  'guests/actions.addGuestsFromAssistantAction': 'cliente',
  'guests/actions.addPersonAction': 'cliente',
  'guests/actions.ensureInvitationLinkAction': 'cliente',
  'guests/actions.importGuestsAction': 'cliente',
  'guests/actions.removePersonAction': 'cliente',
  'guests/actions.reopenRsvpAction': 'cliente',
  'guests/actions.resendInvitationAction': 'cliente',
  'guests/actions.restoreInvitationAction': 'cliente',
  'guests/actions.revokeInvitationAction': 'cliente',
  'guests/actions.sendInvitationAction': 'cliente',
  'guests/actions.setGroupPhoneAction': 'cliente',
  'guests/actions.updatePersonAction': 'cliente',
  'guests/enlace-general-actions.altaConEnlaceGeneralAction': 'sin guardia de evento',
  'guests/enlace-general-actions.crearEnlaceGeneralAction': 'cliente',
  'guests/enlace-general-actions.quitarEnlaceGeneralAction': 'cliente',
  'notifications/avisos-actions.abrirCampanaAction': 'sin guardia de evento',
  'notifications/avisos-actions.activarAparatoAction': 'sin guardia de evento',
  'notifications/avisos-actions.desactivarAparatoAction': 'sin guardia de evento',
  'notifications/avisos-actions.guardarPreferenciasAction': 'sin guardia de evento',
  'notifications/avisos-actions.probarAvisosAction': 'sin guardia de evento',
  'planner/actions.addPaymentAction': 'planner',
  'planner/actions.addTaskAction': 'cliente',
  'planner/actions.editTaskAction': 'cliente',
  'planner/actions.moveTaskAction': 'cliente',
  'planner/actions.removeItemAction': 'planner',
  'planner/actions.removePaymentAction': 'planner',
  'planner/actions.removeTaskAction': 'cliente',
  'planner/actions.saveBudgetPlanAction': 'planner',
  'planner/actions.saveItemAction': 'planner',
  'planner/actions.seedTasksAction': 'cliente',
  'planner/actions.setPaymentPaidAction': 'planner',
  'planner/actions.toggleTaskAction': 'cliente',
  'planner/agenda-actions.emitirSuscripcionAction': 'planner',
  'planner/agenda-actions.marcarEnLaAgendaAction': 'planner',
  'planner/agenda-actions.removeCitaAction': 'planner',
  'planner/agenda-actions.reprogramarEnLaAgendaAction': 'planner',
  'planner/agenda-actions.saveCitaAction': 'planner',
  'planner/dia-actions.emitVendorLinkAction': 'planner',
  'planner/dia-actions.removeCourtMemberAction': 'cliente',
  'planner/dia-actions.removeDocumentAction': 'cliente',
  'planner/dia-actions.removeMomentAction': 'planner',
  'planner/dia-actions.removeRehearsalAction': 'cliente',
  'planner/dia-actions.removeVendorAction': 'planner',
  'planner/dia-actions.revokeVendorLinkAction': 'planner',
  'planner/dia-actions.saveCourtMemberAction': 'cliente',
  'planner/dia-actions.saveMomentAction': 'planner',
  'planner/dia-actions.saveRehearsalAction': 'cliente',
  'planner/dia-actions.saveVendorAction': 'planner',
  'planner/dia-actions.setCourtConfirmedAction': 'cliente',
  'planner/dia-actions.setVendorArrivedAction': 'planner',
  'planner/dia-actions.setVendorStatusAction': 'planner',
  'planner/dia-actions.uploadDocumentAction': 'cliente',
  'plans/actions.applyPlanChangeAction': 'ficha',
  'plans/actions.rejectPlanChangeAction': 'ficha',
  'plans/actions.requestPlanChangeAction': 'ficha',
  'plans/extra-actions.orderExtraAction': 'equipo',
  'registry/actions.addFundAction': 'cliente',
  'registry/actions.addGiftAction': 'cliente',
  'registry/actions.claimGiftAction': 'sin guardia de evento',
  'registry/actions.markPurchasedAction': 'cliente',
  'registry/actions.recordContributionAction': 'cliente',
  'registry/actions.releaseGiftAction': 'sin guardia de evento',
  'registry/actions.releaseGiftAsAtelierAction': 'cliente',
  'registry/actions.removeFundAction': 'cliente',
  'registry/actions.removeGiftAction': 'cliente',
  'registry/actions.updateFundAction': 'cliente',
  'registry/actions.updateGiftAction': 'cliente',
  'registry/formas-actions.guardarFormasDeRegalarAction': 'cliente',
  'reminders/actions.markReminderSentAction': 'cliente',
  'rsvp/preguntas-actions.guardarPreguntasAction': 'cliente',
  'venue/actions.addTableAction': 'cliente',
  'venue/actions.addZoneAction': 'cliente',
  'venue/actions.assignGroupAction': 'cliente',
  'venue/actions.autoAssignAction': 'cliente',
  'venue/actions.moveElementsAction': 'cliente',
  'venue/actions.removeTableAction': 'cliente',
  'venue/actions.removeZoneAction': 'cliente',
  'venue/actions.unassignGroupAction': 'cliente',
  'venue/actions.updateTableAction': 'cliente',
  'venue/actions.updateZoneAction': 'cliente',
}

const MODULOS = ['guests/actions', 'guests/enlace-general-actions', 'planner/actions', 'planner/agenda-actions', 'planner/dia-actions', 'checkin/actions', 'checkin/porter-actions', 'registry/actions', 'registry/formas-actions', 'events/actions', 'events/estilo-actions', 'events/save-the-date-actions', 'events/team-actions', 'events/diseno-actions', 'guestbook/actions', 'reminders/actions', 'plans/extra-actions', 'plans/actions', 'rsvp/preguntas-actions', 'venue/actions', 'notifications/avisos-actions']
it('cada acción del panel de un evento pide la sección que le toca', async () => {
  const real: Record<string, string> = {}
  for (const m of MODULOS) {
    const mod = (await import(`@/app/_acciones/${m}`)) as Record<string, unknown>
    for (const [nombre, fn] of Object.entries(mod)) {
      if (typeof fn !== 'function' || !nombre.endsWith('Action')) continue
      requireEventAccess.mockClear()
      const fd = new FormData()
      fd.set('eventId', 'e1')
      fd.set('eventSlug', 'boda')
      await (fn as (...a: unknown[]) => Promise<unknown>)({ status: 'idle', message: '', eventId: 'e1', eventSlug: 'boda' }, fd).catch(() => undefined)
      const llamada = requireEventAccess.mock.calls[0]
      real[`${m}.${nombre}`] = llamada === undefined ? 'sin guardia de evento' : ((llamada[1] as { section?: string }).section ?? 'full')
    }
  }
  expect(real).toEqual(ESPERADO)
})

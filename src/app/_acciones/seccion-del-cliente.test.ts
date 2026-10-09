import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mesas, Regalos y los recordatorios de Invitados se abren al anfitrión (`section: 'cliente'`).
 * Sus acciones tienen que pedir la misma sección: sin ella heredan `full`, que el cliente no
 * tiene, y cada botón de la pantalla acababa en «Evento no encontrado» (producción, 7 oct).
 */

const requireEventAccess = vi.fn()
const corte = new Error('corte')

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/app/_acciones/sesion', () => ({
  requireSession: async () => ({ userId: 'u1', email: 'a@x.bo', role: 'cliente' }),
  requireEventAccess: (...args: unknown[]) => requireEventAccess(...args),
}))
vi.mock('@/app/composition/container', () => ({}))

beforeEach(() => {
  vi.clearAllMocks()
  // Se corta en la guardia: lo que se mide es qué sección pide, no lo que hace después.
  requireEventAccess.mockRejectedValue(corte)
})

describe('las acciones de las pantallas del anfitrión piden su sección', () => {
  it('mesas, regalos, recordatorios y moneda', async () => {
    const venue = await import('@/app/_acciones/venue/actions')
    const registry = await import('@/app/_acciones/registry/actions')
    const reminders = await import('@/app/_acciones/reminders/actions')
    const events = await import('@/app/_acciones/events/actions')
    const acciones: Array<(input: never) => Promise<unknown>> = [
      venue.addTableAction,
      venue.updateTableAction,
      venue.removeTableAction,
      venue.assignGroupAction,
      venue.unassignGroupAction,
      venue.autoAssignAction,
      venue.addZoneAction,
      venue.updateZoneAction,
      venue.removeZoneAction,
      venue.moveElementsAction,
      registry.addGiftAction,
      registry.updateGiftAction,
      registry.removeGiftAction,
      registry.markPurchasedAction,
      registry.releaseGiftAsAtelierAction,
      registry.addFundAction,
      registry.updateFundAction,
      registry.removeFundAction,
      registry.recordContributionAction,
      reminders.markReminderSentAction,
      events.setEventCurrencyAction,
    ]
    for (const accion of acciones) {
      requireEventAccess.mockClear()
      await expect(accion({ eventId: 'e1', eventSlug: 'boda' } as never)).rejects.toBe(corte)
      expect(requireEventAccess, accion.name).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ section: 'cliente' }))
    }
  })
})

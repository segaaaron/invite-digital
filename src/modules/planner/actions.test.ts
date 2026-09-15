import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireEventAccess = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/modules/identity/session-cookie', () => ({
  requireSession: async () => ({ userId: 'u1', email: 'a@x.bo', role: 'cliente' }),
  requireEventAccess: (...args: unknown[]) => requireEventAccess(...args),
}))
vi.mock('@/app/composition/container', () => ({
  events: { getByIdFor: async () => ({ ok: true, value: { id: 'e1', themeKey: 'boda-bot', eventDate: '2027-05-15' } }) },
  planner: {
    saveItem: async () => ({ ok: true }),
    removeItem: async () => ({ ok: true }),
    addPayment: async () => ({ ok: true }),
    setPaymentPaid: async () => ({ ok: true }),
    removePayment: async () => ({ ok: true }),
    toggleTask: async () => ({ ok: true }),
  },
}))

const form = () => {
  const fd = new FormData()
  for (const [k, v] of Object.entries({ eventId: 'e1', eventSlug: 'boda', estimated: '100', amount: '10', itemId: 'p1', paymentId: 'g1', taskId: 't1' })) fd.set(k, v)
  return fd
}

beforeEach(() => vi.clearAllMocks())

describe('quién toca el dinero', () => {
  // El co-anfitrión ve el presupuesto pero no lo edita: es la sección `planner`
  // (anfitrión y planner), no `cliente`.
  it('toda escritura del presupuesto pide la sección del anfitrión y su planner', async () => {
    const acciones = await import('./actions')
    for (const accion of [acciones.saveItemAction, acciones.removeItemAction, acciones.addPaymentAction, acciones.setPaymentPaidAction, acciones.removePaymentAction]) {
      requireEventAccess.mockClear()
      await accion({ status: 'idle' }, form())
      expect(requireEventAccess, accion.name).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ section: 'planner' }))
    }
  })

  it('las tareas sí las cierra todo el equipo', async () => {
    const { toggleTaskAction } = await import('./actions')
    await toggleTaskAction({ status: 'idle' }, form())
    expect(requireEventAccess).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ section: 'cliente' }))
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'

const requireEventAccess = vi.fn()
const requireFeature = vi.fn()
const saveVendor = vi.fn()
const emitVendorLink = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/shared/config/env', () => ({ env: { SITE_URL: 'https://luxuryatelier.net/' } }))
vi.mock('@/app/_acciones/sesion', () => ({
  requireSession: async () => ({ userId: 'u1', email: 'a@x.bo', role: 'cliente' }),
  requireEventAccess: (...args: unknown[]) => requireEventAccess(...args),
}))
vi.mock('@/app/composition/container', () => ({
  events: { getByIdFor: async () => ok({ id: 'e1', themeKey: 'xv-isabelle' }) },
  plans: { requireFeature: (...args: unknown[]) => requireFeature(...args) },
  planner: { dia: { saveVendor: (...a: unknown[]) => saveVendor(...a), emitVendorLink: (...a: unknown[]) => emitVendorLink(...a) } },
}))

const form = (extra: Record<string, string> = {}) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries({ eventId: 'e1', eventSlug: 'xv-vale', service: 'DJ', status: 'contratado', price: '3500', ...extra })) fd.set(k, v)
  return fd
}

beforeEach(() => vi.clearAllMocks())

describe('las acciones del día y el plan', () => {
  it('sin el planner completo no guarda un proveedor, aunque llegue por POST', async () => {
    requireFeature.mockResolvedValue(err({ kind: 'not_included', detail: 'no' }))
    const { saveVendorAction } = await import('@/app/_acciones/planner/dia-actions')

    expect(await saveVendorAction({ status: 'idle' }, form())).toEqual({ status: 'error', message: 'Tu plan no incluye proveedores, cronograma ni cortejo.' })
    expect(saveVendor).not.toHaveBeenCalled()
    expect(requireEventAccess).toHaveBeenCalledWith(expect.anything(), { eventId: 'e1', eventSlug: 'xv-vale', section: 'planner' })
  })

  it('con el plan, guarda con el precio en centavos y la fiesta del evento', async () => {
    requireFeature.mockResolvedValue(ok({}))
    saveVendor.mockResolvedValue({ ok: true })
    const { saveVendorAction } = await import('@/app/_acciones/planner/dia-actions')

    expect(await saveVendorAction({ status: 'idle' }, form({ category: 'dj' }))).toEqual({ status: 'success' })
    expect(saveVendor).toHaveBeenCalledWith('e1', 'xv', null, expect.objectContaining({ service: 'DJ' }), { precioCents: 3_500_00, categoria: 'dj' })
  })

  it('el enlace para proveedores pide el planner total y devuelve la dirección una vez', async () => {
    requireFeature.mockImplementation(async (_e: string, f: string) => (f === 'plannerTotal' ? ok({}) : err({ kind: 'x', detail: '' })))
    emitVendorLink.mockResolvedValue({ ok: true, token: 'abc' })
    const { emitVendorLinkAction } = await import('@/app/_acciones/planner/dia-actions')

    expect(await emitVendorLinkAction({ status: 'idle' }, form({ vendorId: 'v1' }))).toEqual({ status: 'success', enlace: 'https://luxuryatelier.net/v/abc' })
    expect(requireFeature).toHaveBeenCalledWith('e1', 'plannerTotal')
  })
})

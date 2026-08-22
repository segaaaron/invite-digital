import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { plansError } from './domain/errors'

/**
 * Aquí se llama a las acciones **directamente**, sin pasar por la pantalla. Es el punto
 * del asunto: una Server Action es un extremo HTTP público, y una sección oculta o un
 * botón deshabilitado no protegen de nada. Quien conozca el nombre de la acción puede
 * invocarla, y el límite del plan tiene que cortarla igual.
 */

const requireFeature = vi.fn()
const permitida = () =>
  requireFeature.mockResolvedValue(
    ok({ planSlug: 'alta-costura', maxGuestGroups: null, seating: true, registry: true, checkin: true }),
  )
const noIncluida = () =>
  requireFeature.mockResolvedValue(err(plansError('feature_not_included', 'El plan atelier no incluye X; lo trae firma-3d.')))

const venue = {
  addTable: vi.fn().mockResolvedValue(ok({ id: 't1' })),
  assign: vi.fn().mockResolvedValue(ok(undefined)),
}
const registry = {
  addGift: vi.fn().mockResolvedValue(ok({ id: 'r1' })),
  addFund: vi.fn().mockResolvedValue(ok({ id: 'f1' })),
  claim: vi.fn().mockResolvedValue(ok(undefined)),
  release: vi.fn().mockResolvedValue(ok(undefined)),
}
const guests = {
  resolveByToken: vi.fn().mockResolvedValue(ok({ id: 'g1', eventId: 'e1', label: 'Familia Rojas', seats: 2 })),
}
const checkin = {
  recordGroup: vi.fn().mockResolvedValue(ok({ kind: 'accepted' })),
}
const requireSession = vi.fn().mockResolvedValue({ userId: 'u1' })

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-real-ip': '203.0.113.7' }) }))
vi.mock('@/modules/identity/session-cookie', () => ({ requireSession: () => requireSession() }))
vi.mock('@/app/composition/container', () => ({
  plans: { requireFeature: (...args: unknown[]) => requireFeature(...args), allowanceFor: vi.fn(), listActive: vi.fn() },
  venue,
  registry,
  checkin,
  guests,
}))

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue({ userId: 'u1' })
  guests.resolveByToken.mockResolvedValue(ok({ id: 'g1', eventId: 'e1', label: 'Familia Rojas', seats: 2 }))
})

describe('mesas (venue)', () => {
  it('con el salón incluido la acción funciona', async () => {
    permitida()
    const { addTableAction } = await import('@/modules/venue/actions')

    const r = await addTableAction({ eventId: 'e1', eventSlug: 'boda', label: 'Mesa 1', capacity: 8, shape: 'round' })

    expect(r.ok).toBe(true)
    expect(venue.addTable).toHaveBeenCalled()
  })

  it('sin el salón incluido la acción se rechaza aunque se la llame directamente', async () => {
    noIncluida()
    const { addTableAction } = await import('@/modules/venue/actions')

    const r = await addTableAction({ eventId: 'e1', eventSlug: 'boda', label: 'Mesa 1', capacity: 8, shape: 'round' })

    expect(r).toMatchObject({ ok: false, kind: 'feature_not_included' })
    // Y no llega al caso de uso: rechazar después de escribir no es rechazar.
    expect(venue.addTable).not.toHaveBeenCalled()
  })

  it('la comprobación va después de la sesión, no en vez de ella', async () => {
    noIncluida()
    const { assignGroupAction } = await import('@/modules/venue/actions')

    await assignGroupAction({ eventId: 'e1', eventSlug: 'boda', groupId: 'g1', tableId: 't1' })

    expect(requireSession).toHaveBeenCalled()
    expect(venue.assign).not.toHaveBeenCalled()
  })
})

describe('mesa de regalos (registry)', () => {
  it('con la mesa de regalos incluida la acción funciona', async () => {
    permitida()
    const { addGiftAction } = await import('@/modules/registry/actions')

    const r = await addGiftAction({ eventId: 'e1', eventSlug: 'boda', name: 'Vajilla', priceCents: 50000, store: null, url: null })

    expect(r.ok).toBe(true)
    expect(registry.addGift).toHaveBeenCalled()
  })

  it('sin ella la acción se rechaza aunque se la llame directamente', async () => {
    noIncluida()
    const { addGiftAction } = await import('@/modules/registry/actions')

    const r = await addGiftAction({ eventId: 'e1', eventSlug: 'boda', name: 'Vajilla', priceCents: 50000, store: null, url: null })

    expect(r).toMatchObject({ ok: false, kind: 'feature_not_included' })
    expect(registry.addGift).not.toHaveBeenCalled()
  })

  it('los fondos van por la misma puerta que los regalos', async () => {
    noIncluida()
    const { addFundAction } = await import('@/modules/registry/actions')

    const r = await addFundAction({ eventId: 'e1', eventSlug: 'boda', name: 'Luna de miel', goalCents: 900000, description: null })

    expect(r).toMatchObject({ ok: false, kind: 'feature_not_included' })
    expect(registry.addFund).not.toHaveBeenCalled()
  })
})

describe('modo puerta (checkin)', () => {
  it('con el modo puerta incluido la acción funciona', async () => {
    permitida()
    const { checkInByGroupAction } = await import('@/modules/checkin/actions')

    await checkInByGroupAction({ eventId: 'e1', eventSlug: 'boda', groupId: 'g1', scanId: 's1', arrivedCount: null, scannedAtMs: 0 })

    expect(checkin.recordGroup).toHaveBeenCalled()
  })

  it('sin él la acción se rechaza aunque se la llame directamente', async () => {
    noIncluida()
    const { checkInByGroupAction } = await import('@/modules/checkin/actions')

    await expect(
      checkInByGroupAction({ eventId: 'e1', eventSlug: 'boda', groupId: 'g1', scanId: 's1', arrivedCount: null, scannedAtMs: 0 }),
    ).rejects.toThrow('feature_not_included')

    expect(checkin.recordGroup).not.toHaveBeenCalled()
  })
})

/**
 * El lado del invitado. Estas dos acciones no llevan sesión —el invitado no tiene
 * cuenta— pero el plan las corta igual: la puerta del invitado tiene que cerrarse
 * cuando la mesa de regalos deja de estar incluida, o cualquiera con el enlace sigue
 * reservando en un catálogo que ya no existe.
 */
describe('mesa de regalos · lado del invitado', () => {
  it('con la mesa incluida el invitado reserva como siempre', async () => {
    permitida()
    const { claimGiftAction } = await import('@/modules/registry/actions')

    const r = await claimGiftAction({ token: 'tok', giftId: 'r1' })

    expect(r.ok).toBe(true)
    expect(registry.claim).toHaveBeenCalledWith({ token: 'tok', giftId: 'r1' })
  })

  it('sin la mesa incluida la reserva se rechaza aunque se llame a la acción directamente', async () => {
    noIncluida()
    const { claimGiftAction } = await import('@/modules/registry/actions')

    const r = await claimGiftAction({ token: 'tok', giftId: 'r1' })

    expect(r).toMatchObject({ ok: false, kind: 'feature_not_included' })
    expect(registry.claim).not.toHaveBeenCalled()
  })

  it('liberar también se rechaza: devolvería el regalo a un catálogo cerrado', async () => {
    noIncluida()
    const { releaseGiftAction } = await import('@/modules/registry/actions')

    const r = await releaseGiftAction({ token: 'tok', giftId: 'r1' })

    expect(r).toMatchObject({ ok: false, kind: 'feature_not_included' })
    expect(registry.release).not.toHaveBeenCalled()
  })

  it('el mensaje que cruza al invitado es la clase del error, no el detalle con el plan dentro', async () => {
    noIncluida()
    const { claimGiftAction } = await import('@/modules/registry/actions')

    const r = await claimGiftAction({ token: 'tok', giftId: 'r1' })

    expect(r).toEqual({ ok: false, kind: 'feature_not_included', message: 'feature_not_included' })
  })

  it('un token desconocido sigue respondiendo not_found, no que el plan no la incluye', async () => {
    // 404 y nunca 403: distinguirlos confirmaría que el token existe.
    noIncluida()
    guests.resolveByToken.mockResolvedValue(err(plansError('not_found', 'Ese enlace no existe.')))
    registry.claim.mockResolvedValue(err(plansError('not_found', 'Ese enlace no existe.')))
    const { claimGiftAction } = await import('@/modules/registry/actions')

    const r = await claimGiftAction({ token: 'desconocido', giftId: 'r1' })

    expect(r).toMatchObject({ ok: false, kind: 'not_found' })
  })
})

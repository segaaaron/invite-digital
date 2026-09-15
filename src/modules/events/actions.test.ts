import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { eventError } from './domain/errors'

const revokeShare = vi.fn()
const setPassword = vi.fn()
const requireFeature = vi.fn()
const requireSession = vi.fn().mockResolvedValue({ userId: 'u1' })
const getByIdFor = vi.fn()
const update = vi.fn()
const seedContent = vi.fn()
const allowanceFor = vi.fn()
const listGroups = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// La guardia de multitenencia se deja pasar en estas pruebas: lo que comprueban es el
// comportamiento de la acción, y que la guardia esté puesta lo vigila `pnpm verify:tenancy`
// y la e2e con dos usuarios de verdad.
vi.mock('@/modules/identity/session-cookie', () => ({
  requireSession: () => requireSession(),
  requireEventAccess: async () => {},
}))
vi.mock('@/app/composition/container', () => ({
  events: {
    revokeShare: (...args: unknown[]) => revokeShare(...args),
    create: vi.fn(),
    update: (...args: unknown[]) => update(...args),
    getByIdFor: (...args: unknown[]) => getByIdFor(...args),
    seedContent: (...args: unknown[]) => seedContent(...args),
    createShare: vi.fn(),
    setPassword: (...args: unknown[]) => setPassword(...args),
  },
  plans: {
    requireFeature: (...args: unknown[]) => requireFeature(...args),
    allowanceFor: (...args: unknown[]) => allowanceFor(...args),
  },
  guests: { list: (...args: unknown[]) => listGroups(...args) },
}))

const form = (): FormData => {
  const fd = new FormData()
  fd.set('shareId', 's1')
  fd.set('eventSlug', 'boda')
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue({ userId: 'u1' })
})

describe('revokeClientShareAction', () => {
  it('revocado de verdad, devuelve éxito', async () => {
    revokeShare.mockResolvedValue(ok(undefined))
    const { revokeClientShareAction } = await import('./actions')

    expect(await revokeClientShareAction({ status: 'idle' }, form())).toEqual({ status: 'success' })
  })

  it('si el caso de uso rechaza, devuelve error en vez de fingir que se revocó', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    revokeShare.mockResolvedValue(err(eventError('storage_failure', 'La base no responde.')))
    const { revokeClientShareAction } = await import('./actions')

    expect(await revokeClientShareAction({ status: 'idle' }, form())).toEqual({ status: 'error' })
    // El registro del servidor se conserva: sigue siendo por donde se diagnostica.
    expect(spy).toHaveBeenCalledWith('revocación de enlace rechazada', 'storage_failure', 'La base no responde.')
    spy.mockRestore()
  })

  it('exige sesión', async () => {
    revokeShare.mockResolvedValue(ok(undefined))
    const { revokeClientShareAction } = await import('./actions')

    await revokeClientShareAction({ status: 'idle' }, form())
    expect(requireSession).toHaveBeenCalled()
  })
})

describe('setEventPrivacyAction y el plan', () => {
  const privacidad = (tipo: 'password' | 'public'): FormData => {
    const fd = new FormData()
    fd.set('eventId', 'e1')
    fd.set('eventSlug', 'boda')
    fd.set('privacy', tipo)
    fd.set('password', 'clave-de-la-boda')
    return fd
  }

  it('sin la contraseña en el plan no la pone, aunque llegue por POST', async () => {
    requireFeature.mockResolvedValue(err({ kind: 'feature_not_included', detail: 'Tu plan no incluye la invitación con contraseña.' }))
    const { setEventPrivacyAction } = await import('./actions')

    const r = await setEventPrivacyAction({ status: 'idle' }, privacidad('password'))

    expect(r).toEqual({ status: 'error', message: 'Tu plan no incluye la invitación con contraseña.' })
    expect(setPassword).not.toHaveBeenCalled()
  })

  it('quitarla siempre se puede: dejar la invitación pública no es una función de pago', async () => {
    requireFeature.mockResolvedValue(err({ kind: 'feature_not_included', detail: 'no' }))
    setPassword.mockResolvedValue(ok(undefined))
    const { setEventPrivacyAction } = await import('./actions')

    expect(await setEventPrivacyAction({ status: 'idle' }, privacidad('public'))).toEqual({ status: 'success' })
    expect(setPassword).toHaveBeenCalledWith({ eventId: 'e1', password: null })
  })
})

describe('updateEventAction y el cambio de modelo según el plan', () => {
  const edicion = (themeKey: string): FormData => {
    const fd = new FormData()
    fd.set('id', 'e1')
    fd.set('themeKey', themeKey)
    fd.set('title', 'Boda de Ana y Luis')
    fd.set('slug', 'boda-ana')
    fd.set('eventDate', '2026-12-12')
    return fd
  }
  const conRegla = (designChange: string, repartido: boolean, role = 'atelier') => {
    requireSession.mockResolvedValue({ userId: 'u1', role })
    getByIdFor.mockResolvedValue(ok({ id: 'e1', themeKey: 'boda-bot' }))
    allowanceFor.mockResolvedValue(ok({ designChange }))
    listGroups.mockResolvedValue(ok([{ invitationSentAt: repartido ? new Date() : null }]))
    update.mockImplementation(async (input: { themeKey: string }) => ok({ id: 'e1', slug: 'boda-ana', themeKey: input.themeKey }))
  }
  const temaGuardado = () => (update.mock.calls[0]?.[0] as { themeKey: string }).themeKey

  it('«ninguno» conserva el modelo aunque el POST pida otro', async () => {
    conRegla('ninguno', false)
    const { updateEventAction } = await import('./actions')
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda-ed'))
    expect(temaGuardado()).toBe('boda-bot')
    expect(seedContent).not.toHaveBeenCalled()
  })

  it('«antes de repartir» lo cambia sin enlaces repartidos y lo conserva con uno ya enviado', async () => {
    conRegla('antes_de_repartir', false)
    const { updateEventAction } = await import('./actions')
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda-ed'))
    expect(temaGuardado()).toBe('boda-ed')

    vi.clearAllMocks()
    conRegla('antes_de_repartir', true)
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda-ed'))
    expect(temaGuardado()).toBe('boda-bot')
  })

  it('«siempre» lo cambia, pero nunca de boda a XV', async () => {
    conRegla('siempre', true)
    const { updateEventAction } = await import('./actions')
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda-ed'))
    expect(temaGuardado()).toBe('boda-ed')

    vi.clearAllMocks()
    conRegla('siempre', true)
    await updateEventAction({ status: 'idle', message: '' }, edicion('xv-isabelle'))
    expect(temaGuardado()).toBe('boda-bot')
  })

  // El admin corrige ventas mal cargadas: el modelo equivocado se arregla sin comprar un extra.
  it('el admin lo cambia aunque el plan no lo incluya', async () => {
    conRegla('ninguno', true, 'admin')
    const { updateEventAction } = await import('./actions')
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda-ed'))
    expect(temaGuardado()).toBe('boda-ed')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'

const setPassword = vi.fn()
const requireFeature = vi.fn()
const requireSession = vi.fn().mockResolvedValue({ userId: 'u1' })
const getByIdFor = vi.fn()
const update = vi.fn()
const seedContent = vi.fn()
const allowanceFor = vi.fn()
const listGroups = vi.fn()
const create = vi.fn()
const cheapestActive = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// La guardia de multitenencia se deja pasar en estas pruebas: lo que comprueban es el
// comportamiento de la acción, y que la guardia esté puesta lo vigila `pnpm verify:tenancy`
// y la e2e con dos usuarios de verdad.
vi.mock('@/app/_acciones/sesion', () => ({
  requireSession: () => requireSession(),
  requireEventAccess: async () => {},
}))
vi.mock('@/app/composition/container', () => ({
  events: {
    create: (...args: unknown[]) => create(...args),
    update: (...args: unknown[]) => update(...args),
    getByIdFor: (...args: unknown[]) => getByIdFor(...args),
    seedContent: (...args: unknown[]) => seedContent(...args),
    setPassword: (...args: unknown[]) => setPassword(...args),
  },
  plans: {
    requireFeature: (...args: unknown[]) => requireFeature(...args),
    allowanceFor: (...args: unknown[]) => allowanceFor(...args),
    cheapestActive: (...args: unknown[]) => cheapestActive(...args),
  },
  guests: { list: (...args: unknown[]) => listGroups(...args) },
}))

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue({ userId: 'u1' })
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
    const { setEventPrivacyAction } = await import('@/app/_acciones/events/actions')

    const r = await setEventPrivacyAction({ status: 'idle' }, privacidad('password'))

    expect(r).toEqual({ status: 'error', message: 'Tu plan no incluye la invitación con contraseña.' })
    expect(setPassword).not.toHaveBeenCalled()
  })

  it('quitarla siempre se puede: dejar la invitación pública no es una función de pago', async () => {
    requireFeature.mockResolvedValue(err({ kind: 'feature_not_included', detail: 'no' }))
    setPassword.mockResolvedValue(ok(undefined))
    const { setEventPrivacyAction } = await import('@/app/_acciones/events/actions')

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
    const { updateEventAction } = await import('@/app/_acciones/events/actions')
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda-ed'))
    expect(temaGuardado()).toBe('boda-bot')
    expect(seedContent).not.toHaveBeenCalled()
  })

  it('«antes de repartir» lo cambia sin enlaces repartidos y lo conserva con uno ya enviado', async () => {
    conRegla('antes_de_repartir', false)
    const { updateEventAction } = await import('@/app/_acciones/events/actions')
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda-ed'))
    expect(temaGuardado()).toBe('boda-ed')

    vi.clearAllMocks()
    conRegla('antes_de_repartir', true)
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda-ed'))
    expect(temaGuardado()).toBe('boda-bot')
  })

  it('«siempre» lo cambia, pero nunca de boda a XV', async () => {
    conRegla('siempre', true)
    const { updateEventAction } = await import('@/app/_acciones/events/actions')
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda-ed'))
    expect(temaGuardado()).toBe('boda-ed')

    vi.clearAllMocks()
    conRegla('siempre', true)
    await updateEventAction({ status: 'idle', message: '' }, edicion('xv-isabelle'))
    expect(temaGuardado()).toBe('boda-bot')
  })

  // Étoile (`boda`) está retirado: el selector no lo ofrece y un POST manipulado tampoco lo cuela.
  it('nunca a un diseño retirado, ni para el admin', async () => {
    conRegla('siempre', false, 'admin')
    const { updateEventAction } = await import('@/app/_acciones/events/actions')
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda'))
    expect(temaGuardado()).toBe('boda-bot')
  })

  // El admin corrige ventas mal cargadas: el modelo equivocado se arregla sin comprar un extra.
  it('el admin lo cambia aunque el plan no lo incluya', async () => {
    conRegla('ninguno', true, 'admin')
    const { updateEventAction } = await import('@/app/_acciones/events/actions')
    await updateEventAction({ status: 'idle', message: '' }, edicion('boda-ed'))
    expect(temaGuardado()).toBe('boda-ed')
  })
})

describe('la retención la fija el plan, no el formulario', () => {
  const formulario = (): FormData => {
    const fd = new FormData()
    fd.set('id', 'e1')
    fd.set('themeKey', 'boda-bot')
    fd.set('retentionDays', '9999')
    return fd
  }

  // El más barato por precio, el mismo que `getEventAllowance` aplica a un evento sin plan:
  // el primero del escaparate puede ser otro.
  it('al crear, el evento sin plan toma los días en línea del plan más barato', async () => {
    requireSession.mockResolvedValue({ userId: 'u1', role: 'atelier' })
    cheapestActive.mockResolvedValue({ onlineDays: 60 })
    create.mockResolvedValue(ok({ id: 'e1', themeKey: 'boda-bot' }))
    const { createEventAction } = await import('@/app/_acciones/events/actions')

    await createEventAction({ status: 'idle', message: '' }, formulario())
    expect((create.mock.calls[0]?.[0] as { retentionDays: number }).retentionDays).toBe(60)
  })

  it('al crear, un diseño retirado se rechaza sin crear nada', async () => {
    requireSession.mockResolvedValue({ userId: 'u1', role: 'atelier' })
    cheapestActive.mockResolvedValue({ onlineDays: 60 })
    const { createEventAction } = await import('@/app/_acciones/events/actions')
    const fd = formulario()
    fd.set('themeKey', 'boda')

    expect(await createEventAction({ status: 'idle', message: '' }, fd)).toEqual({ status: 'error', message: 'invalid_theme' })
    expect(create).not.toHaveBeenCalled()
  })

  it('al editar, conserva la que tiene aunque el POST mande otra', async () => {
    requireSession.mockResolvedValue({ userId: 'u1', role: 'admin' })
    getByIdFor.mockResolvedValue(ok({ id: 'e1', themeKey: 'boda-bot', retentionDays: 180 }))
    update.mockImplementation(async (input: { themeKey: string }) => ok({ id: 'e1', slug: 'boda-ana', themeKey: input.themeKey }))
    const { updateEventAction } = await import('@/app/_acciones/events/actions')

    await updateEventAction({ status: 'idle', message: '' }, formulario())
    expect((update.mock.calls[0]?.[0] as { retentionDays: number }).retentionDays).toBe(180)
  })
})

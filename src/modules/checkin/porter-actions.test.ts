import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'

const requireSession = vi.fn()
const requireEventAccess = vi.fn()
const requireFeature = vi.fn()
const allowanceFor = vi.fn()
const add = vi.fn()
const revoke = vi.fn()
const enter = vi.fn()
const resolve = vi.fn()
const record = vi.fn()
const recordGroup = vi.fn()
const adjust = vi.fn()
const voidArrival = vi.fn()
const getById = vi.fn()
const cookieSet = vi.fn()
const cookieGet = vi.fn()
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-real-ip': '203.0.113.7' }),
  cookies: async () => ({ set: cookieSet, get: cookieGet }),
}))
vi.mock('@/shared/config/env', () => ({ env: { SITE_URL: 'https://luxuryatelier.net' } }))
vi.mock('@/modules/identity/session-cookie', () => ({
  requireSession: () => requireSession(),
  requireEventAccess: (...a: unknown[]) => requireEventAccess(...a),
}))
vi.mock('@/app/composition/container', () => ({
  porters: { add: (...a: unknown[]) => add(...a), revoke: (...a: unknown[]) => revoke(...a), enter: (...a: unknown[]) => enter(...a), resolve: (...a: unknown[]) => resolve(...a) },
  plans: { requireFeature: (...a: unknown[]) => requireFeature(...a), allowanceFor: (...a: unknown[]) => allowanceFor(...a) },
  checkin: {
    record: (...a: unknown[]) => record(...a),
    recordGroup: (...a: unknown[]) => recordGroup(...a),
    adjust: (...a: unknown[]) => adjust(...a),
    void: (...a: unknown[]) => voidArrival(...a),
  },
  events: { getByIdUnscoped: (...a: unknown[]) => getById(...a) },
}))

const capacidad = (maxDoorPorters: number) => ok({ planSlug: 'firma-3d', maxGuestGroups: 80, seating: true, registry: true, checkin: true, maxDoorPorters })
const sesion = ok({ porterId: 'p1', eventId: 'e1', eventSlug: 'xv-valeria', eventTitle: 'XV de Valeria', name: 'Carlos', gate: null })

const formulario = (datos: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(datos)) f.set(k, v)
  return f
}

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue({ userId: 'u1', email: 'a@x.bo', role: 'cliente' })
  requireEventAccess.mockResolvedValue(undefined)
  requireFeature.mockResolvedValue(capacidad(3))
  allowanceFor.mockResolvedValue(capacidad(3))
  getById.mockResolvedValue(ok({ id: 'e1', title: 'XV de Valeria' }))
  cookieGet.mockReturnValue({ value: 'TOKEN' })
  resolve.mockResolvedValue(sesion)
})

describe('addPorterAction', () => {
  it('exige la sección de porteros y pasa el tope del plan', async () => {
    add.mockResolvedValue(ok({ id: 'p1', token: 'TOKEN', pin: '123456' }))
    const { addPorterAction } = await import('./porter-actions')

    const r = await addPorterAction({ status: 'idle' }, formulario({ eventId: 'e1', eventSlug: 'xv-valeria', name: 'Carlos', phone: '70012345', gate: '' }))

    expect(requireEventAccess).toHaveBeenCalledWith(expect.anything(), { eventId: 'e1', eventSlug: 'xv-valeria', section: 'porteros' })
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'e1', limit: 3, createdByUserId: 'u1', name: 'Carlos' }))
    expect(r).toMatchObject({ status: 'created', nombre: 'Carlos', enlace: 'https://luxuryatelier.net/p/TOKEN', pin: '123456' })
  })

  it('el WhatsApp lleva enlace y PIN y el nombre del evento', async () => {
    add.mockResolvedValue(ok({ id: 'p1', token: 'TOKEN', pin: '123456' }))
    const { addPorterAction } = await import('./porter-actions')

    const r = await addPorterAction({ status: 'idle' }, formulario({ eventId: 'e1', eventSlug: 'xv-valeria', name: 'Carlos', phone: '70012345', gate: '' }))

    const enlace = r.status === 'created' ? decodeURIComponent(r.whatsapp ?? '') : ''
    expect(enlace).toContain('wa.me/59170012345')
    expect(enlace).toContain('XV de Valeria')
    expect(enlace).toContain('https://luxuryatelier.net/p/TOKEN')
    expect(enlace).toContain('123456')
  })

  it('con un plan sin puerta no escribe nada', async () => {
    requireFeature.mockResolvedValue(err({ kind: 'feature_not_included', detail: 'Tu plan no incluye el modo puerta.' }))
    const { addPorterAction } = await import('./porter-actions')

    const r = await addPorterAction({ status: 'idle' }, formulario({ eventId: 'e1', eventSlug: 'x', name: 'Carlos', phone: '', gate: '' }))

    expect(r.status).toBe('error')
    expect(add).not.toHaveBeenCalled()
  })

  it('devuelve el motivo del cupo lleno', async () => {
    add.mockResolvedValue(err({ kind: 'limit_reached', detail: 'Tu plan admite hasta 3 porteros a la vez.' }))
    const { addPorterAction } = await import('./porter-actions')

    const r = await addPorterAction({ status: 'idle' }, formulario({ eventId: 'e1', eventSlug: 'x', name: 'D', phone: '', gate: '' }))

    expect(r).toEqual({ status: 'error', message: 'Tu plan admite hasta 3 porteros a la vez.' })
  })
})

describe('removePorterAction', () => {
  it('quita solo desde su evento, con la sección de porteros', async () => {
    revoke.mockResolvedValue(true)
    const { removePorterAction } = await import('./porter-actions')

    const r = await removePorterAction({ status: 'idle' }, formulario({ eventId: 'e1', eventSlug: 'x', porterId: 'p1' }))

    expect(requireEventAccess).toHaveBeenCalledWith(expect.anything(), { eventId: 'e1', eventSlug: 'x', section: 'porteros' })
    expect(revoke).toHaveBeenCalledWith('e1', 'p1')
    expect(r).toEqual({ status: 'removed' })
  })
})

describe('enterAsPorterAction', () => {
  it('con el PIN bueno deja la cookie y lleva a la puerta', async () => {
    enter.mockResolvedValue(sesion)
    const { enterAsPorterAction } = await import('./porter-actions')

    await expect(enterAsPorterAction({ status: 'idle' }, formulario({ token: 'TOKEN', pin: '123456' }))).rejects.toThrow('REDIRECT:/p/TOKEN/puerta')
    expect(cookieSet).toHaveBeenCalledWith('door_porter', 'TOKEN', expect.objectContaining({ httpOnly: true, path: '/p' }))
  })

  it('cada motivo de rechazo tiene su mensaje y no deja cookie', async () => {
    const { enterAsPorterAction } = await import('./porter-actions')
    const casos: [string, RegExp][] = [
      ['invalido', /no es correcto/],
      ['bloqueado', /15 minutos/],
      ['fuera_de_horario', /día del evento/],
      ['quitado', /ya no está disponible/],
    ]
    for (const [motivo, mensaje] of casos) {
      enter.mockResolvedValue(err(motivo))
      const r = await enterAsPorterAction({ status: 'idle' }, formulario({ token: 'TOKEN', pin: '000000' }))
      expect(r.status === 'error' && r.message).toMatch(mensaje)
    }
    expect(cookieSet).not.toHaveBeenCalled()
  })
})

describe('acciones del portero en la puerta', () => {
  const escaneo = { scanId: 's1', scanned: 'X', arrivedCount: null, scannedAtMs: 1 }

  it('registran en SU evento, nunca en uno que mande el navegador, y dicen quién fue', async () => {
    record.mockResolvedValue(ok([]))
    const { recordScansAsPorterAction } = await import('./porter-actions')

    await recordScansAsPorterAction({ scans: [escaneo], eventId: 'OTRO' } as never)

    expect(record).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'e1', recordedBy: 'porter:p1' }))
    expect(requireSession).not.toHaveBeenCalled()
  })

  it('sin portero válido no registra nada', async () => {
    resolve.mockResolvedValue(err('quitado'))
    const { recordScansAsPorterAction, checkInByGroupAsPorterAction, adjustArrivalAsPorterAction, voidArrivalAsPorterAction } = await import('./porter-actions')

    await expect(recordScansAsPorterAction({ scans: [escaneo] })).rejects.toThrow('porter_denied')
    await expect(checkInByGroupAsPorterAction({ groupId: 'g1', scanId: 's1', arrivedCount: null, scannedAtMs: 1 })).rejects.toThrow('porter_denied')
    expect(await adjustArrivalAsPorterAction({ scanId: 's1', arrivedCount: 2 })).toEqual({ status: 'error', kind: 'not_found' })
    expect(await voidArrivalAsPorterAction({ scanId: 's1' })).toEqual({ status: 'error', kind: 'not_found' })
    expect(record).not.toHaveBeenCalled()
    expect(adjust).not.toHaveBeenCalled()
  })

  it('corregir y deshacer van con el evento del portero', async () => {
    adjust.mockResolvedValue(ok(undefined))
    voidArrival.mockResolvedValue(ok(undefined))
    const { adjustArrivalAsPorterAction, voidArrivalAsPorterAction } = await import('./porter-actions')

    await adjustArrivalAsPorterAction({ scanId: 's1', arrivedCount: 2 })
    await voidArrivalAsPorterAction({ scanId: 's1' })

    expect(adjust).toHaveBeenCalledWith({ eventId: 'e1', scanId: 's1', arrivedCount: 2 })
    expect(voidArrival).toHaveBeenCalledWith({ eventId: 'e1', scanId: 's1' })
  })
})

describe('porterAccessOkAction', () => {
  it('dice si el acceso del portero sigue abierto', async () => {
    const { porterAccessOkAction } = await import('./porter-actions')
    expect(await porterAccessOkAction()).toBe(true)
    resolve.mockResolvedValue(err('fuera_de_horario'))
    expect(await porterAccessOkAction()).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/result'

const open = vi.fn()
const close = vi.fn()
const record = vi.fn()
const membershipsOf = vi.fn()
const sendSupportAccess = vi.fn()
const sendClientAccess = vi.fn()
const resetClientAccess = vi.fn()
const requireSession = vi.fn()
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
const redirect = vi.fn<(url: string) => never>(() => {
  throw new Error('NEXT_REDIRECT')
})

vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url), notFound: () => notFound() }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'token' }) }) }))
vi.mock('@/app/_acciones/sesion', () => ({
  SESSION_COOKIE: 'invite_session',
  requireAdmin: async () => ({ userId: 'a1', email: 'admin@x.bo', role: 'admin', mustChangePassword: false }),
  requireSession: () => requireSession(),
}))
vi.mock('@/app/composition/container', () => ({
  identity: {
    authenticateSession: async () => ok({ sessionId: 'ses1', userId: 'a1', renewedUntil: null, supportSessionId: null }),
    actorOf: async () => ({ id: 'c1', email: 'novios@x.bo', role: 'cliente', mustChangePassword: false }),
    support: { open: (...a: unknown[]) => open(...a), close: (...a: unknown[]) => close(...a) },
    resetClientAccess: (...a: unknown[]) => resetClientAccess(...a),
  },
  events: {
    getByIdUnscoped: async () => ok({ id: 'e1', slug: 'boda-ana', title: 'Boda de Ana' }),
    staff: { membershipsOf: (...a: unknown[]) => membershipsOf(...a) },
  },
  admin: { record: (...a: unknown[]) => record(...a) },
  notifications: { sendSupportAccess: (...a: unknown[]) => sendSupportAccess(...a), sendClientAccess: (...a: unknown[]) => sendClientAccess(...a) },
}))

const form = (motivo: string): FormData => {
  const fd = new FormData()
  fd.set('eventId', 'e1')
  fd.set('clientUserId', 'c1')
  fd.set('motivo', motivo)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  membershipsOf.mockResolvedValue(['cliente'])
  open.mockResolvedValue('sp1')
  sendSupportAccess.mockResolvedValue(true)
})

describe('enterAsClientAction', () => {
  it('sin motivo suficiente no entra', async () => {
    const { enterAsClientAction } = await import('@/app/_acciones/admin/support-actions')
    expect((await enterAsClientAction({ status: 'idle' }, form('corto'))).status).toBe('error')
    expect(open).not.toHaveBeenCalled()
  })

  it('solo como el anfitrión de ese evento: un id cualquiera del formulario no abre nada', async () => {
    membershipsOf.mockResolvedValue(['puerta'])
    const { enterAsClientAction } = await import('@/app/_acciones/admin/support-actions')
    expect((await enterAsClientAction({ status: 'idle' }, form('La lista no carga desde ayer'))).status).toBe('error')
    expect(open).not.toHaveBeenCalled()
  })

  it('con motivo y anfitrión: abre en su sesión, registra, avisa al cliente y entra a su boda', async () => {
    const { enterAsClientAction } = await import('@/app/_acciones/admin/support-actions')
    await expect(enterAsClientAction({ status: 'idle' }, form('La lista no carga desde ayer'))).rejects.toThrow('NEXT_REDIRECT')
    expect(open).toHaveBeenCalledWith({ sessionId: 'ses1', adminUserId: 'a1', adminEmail: 'admin@x.bo', clientUserId: 'c1', eventId: 'e1', reason: 'La lista no carga desde ayer' })
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'a1' }), expect.objectContaining({ action: 'soporte.entrada', subject: 'boda-ana' }))
    expect(sendSupportAccess).toHaveBeenCalledWith(expect.objectContaining({ to: 'novios@x.bo', motivo: 'La lista no carga desde ayer' }))
    expect(redirect).toHaveBeenCalledWith('/panel/eventos/boda-ana')
  })
})

describe('leaveSupportAction', () => {
  it('quien no está en modo soporte recibe 404: un cliente no llega a nada de admin', async () => {
    requireSession.mockResolvedValue({ userId: 'c1', email: 'novios@x.bo', role: 'cliente', mustChangePassword: false })
    const { leaveSupportAction } = await import('@/app/_acciones/admin/support-actions')
    await expect(leaveSupportAction()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(close).not.toHaveBeenCalled()
  })

  it('en modo soporte, cierra, registra como el admin y vuelve a la cartera', async () => {
    requireSession.mockResolvedValue({ userId: 'c1', email: 'novios@x.bo', role: 'cliente', mustChangePassword: false, soporte: { id: 'sp1', adminUserId: 'a1', adminEmail: 'admin@x.bo' } })
    const { leaveSupportAction } = await import('@/app/_acciones/admin/support-actions')
    await expect(leaveSupportAction()).rejects.toThrow('NEXT_REDIRECT')
    expect(close).toHaveBeenCalledWith('ses1', expect.any(Date))
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'a1', role: 'admin' }), expect.objectContaining({ action: 'soporte.salida' }))
    expect(redirect).toHaveBeenCalledWith('/panel/admin/eventos')
  })
})

describe('resetClientAccessAction', () => {
  it('solo sobre el anfitrión de esa boda', async () => {
    membershipsOf.mockResolvedValue([])
    const { resetClientAccessAction } = await import('@/app/_acciones/admin/support-actions')
    expect((await resetClientAccessAction({ status: 'idle' }, form(''))).status).toBe('error')
    expect(resetClientAccess).not.toHaveBeenCalled()
  })

  it('manda la provisional por correo, lo registra y solo la enseña si el correo no salió', async () => {
    resetClientAccess.mockResolvedValue(ok({ email: 'novios@x.bo', password: 'prov-123' }))
    sendClientAccess.mockResolvedValue(false)
    const { resetClientAccessAction } = await import('@/app/_acciones/admin/support-actions')
    const r = await resetClientAccessAction({ status: 'idle' }, form(''))
    expect(r).toEqual({ status: 'success', message: expect.any(String), password: 'prov-123' })
    expect(sendClientAccess).toHaveBeenCalledWith({ to: 'novios@x.bo', password: 'prov-123', eventTitle: 'Boda de Ana' })
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'a1' }), expect.objectContaining({ action: 'acceso.restablecido' }))

    sendClientAccess.mockResolvedValue(true)
    const conCorreo = await resetClientAccessAction({ status: 'idle' }, form(''))
    expect(conCorreo.status === 'success' && 'password' in conCorreo).toBe(false)
  })
})

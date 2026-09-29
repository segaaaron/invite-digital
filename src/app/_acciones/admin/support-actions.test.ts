import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/result'

const open = vi.fn()
const close = vi.fn()
const record = vi.fn()
const membershipsOf = vi.fn()
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
  notifications: { sendClientAccess: (...a: unknown[]) => sendClientAccess(...a) },
}))

const form = (): FormData => {
  const fd = new FormData()
  fd.set('eventId', 'e1')
  fd.set('clientUserId', 'c1')
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  membershipsOf.mockResolvedValue(['cliente'])
  open.mockResolvedValue('sp1')
})

describe('enterAsClientAction', () => {
  it('solo como el anfitrión de ese evento: un id cualquiera del navegador no abre nada', async () => {
    membershipsOf.mockResolvedValue(['puerta'])
    const { enterAsClientAction } = await import('@/app/_acciones/admin/support-actions')
    expect((await enterAsClientAction({ eventId: 'e1', clientUserId: 'c1' })).status).toBe('error')
    expect(open).not.toHaveBeenCalled()
  })

  it('sin motivo: abre en su sesión, lo deja en la auditoría y devuelve el evento (navega el navegador, no `redirect`)', async () => {
    const { enterAsClientAction } = await import('@/app/_acciones/admin/support-actions')
    expect(await enterAsClientAction({ eventId: 'e1', clientUserId: 'c1' })).toEqual({ status: 'ok', href: '/panel/eventos/boda-ana' })
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'ses1', adminUserId: 'a1', clientUserId: 'c1', eventId: 'e1' }))
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'a1' }), { action: 'soporte.entrada', subject: 'boda-ana', detail: 'como novios@x.bo' })
    expect(redirect).not.toHaveBeenCalled()
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
    expect(await leaveSupportAction()).toEqual({ status: 'ok', href: '/panel/admin/eventos' })
    expect(close).toHaveBeenCalledWith('ses1', expect.any(Date))
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'a1', role: 'admin' }), expect.objectContaining({ action: 'soporte.salida' }))
  })
})

describe('resetClientAccessAction', () => {
  it('solo sobre el anfitrión de esa boda', async () => {
    membershipsOf.mockResolvedValue([])
    const { resetClientAccessAction } = await import('@/app/_acciones/admin/support-actions')
    expect((await resetClientAccessAction({ status: 'idle' }, form())).status).toBe('error')
    expect(resetClientAccess).not.toHaveBeenCalled()
  })

  it('manda la provisional por correo, lo registra y solo la enseña si el correo no salió', async () => {
    resetClientAccess.mockResolvedValue(ok({ email: 'novios@x.bo', password: 'prov-123' }))
    sendClientAccess.mockResolvedValue(false)
    const { resetClientAccessAction } = await import('@/app/_acciones/admin/support-actions')
    const r = await resetClientAccessAction({ status: 'idle' }, form())
    expect(r).toEqual({ status: 'success', message: expect.any(String), password: 'prov-123' })
    expect(sendClientAccess).toHaveBeenCalledWith({ to: 'novios@x.bo', password: 'prov-123', eventTitle: 'Boda de Ana' })
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ userId: 'a1' }), expect.objectContaining({ action: 'acceso.restablecido' }))

    sendClientAccess.mockResolvedValue(true)
    const conCorreo = await resetClientAccessAction({ status: 'idle' }, form())
    expect(conCorreo.status === 'success' && 'password' in conCorreo).toBe(false)
  })
})

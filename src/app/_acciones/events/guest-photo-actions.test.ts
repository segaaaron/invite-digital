import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { eventError } from '@/modules/events/domain/errors'

const resolveByToken = vi.fn()
const saveFromGuest = vi.fn()
const passwordHashOf = vi.fn()
const requireFeature = vi.fn()

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-real-ip': '10.0.0.1' }),
  cookies: async () => ({ get: () => undefined, set: () => {} }),
}))
vi.mock('@/app/composition/container', () => ({
  guests: { resolveByToken: (...args: unknown[]) => resolveByToken(...args) },
  plans: { requireFeature: (...args: unknown[]) => requireFeature(...args) },
  events: {
    media: { saveFromGuest: (...args: unknown[]) => saveFromGuest(...args) },
    passwordHashOf: (...args: unknown[]) => passwordHashOf(...args),
    checkPassword: vi.fn(),
  },
}))

const archivo = (): File => new File([new Uint8Array([1, 2, 3])], 'boda.jpg', { type: 'image/jpeg' })

const form = (over: { token?: string; file?: File | null } = {}): FormData => {
  const fd = new FormData()
  fd.set('token', over.token ?? 'tok')
  if (over.file !== null) fd.set('file', over.file ?? archivo())
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  // El limitador vive en el módulo, así que sin esto la cuenta se arrastra entre pruebas y
  // la última del fichero sale limitada por lo que hizo la primera.
  vi.resetModules()
  resolveByToken.mockResolvedValue(ok({ id: 'g1', eventId: 'e1' }))
  // Sin contraseña no hay puerta que abrir: el evento es público con el enlace.
  passwordHashOf.mockResolvedValue(null)
  saveFromGuest.mockResolvedValue({ ok: true, id: 'm1' })
  requireFeature.mockResolvedValue(ok({}))
})

describe('uploadGuestPhotoAction', () => {
  it('guarda la fotografía con el grupo del token dentro', async () => {
    const { uploadGuestPhotoAction } = await import('@/app/_acciones/events/actions')

    expect(await uploadGuestPhotoAction({ status: 'idle', message: '' }, form())).toEqual({
      status: 'success',
      message: '',
    })
    expect(saveFromGuest).toHaveBeenCalledWith('e1', 'g1', expect.anything())
  })

  it('un token desconocido responde lo mismo que uno revocado, y no escribe nada', async () => {
    resolveByToken.mockResolvedValue(err(eventError('not_found', 'no existe')))
    const { uploadGuestPhotoAction } = await import('@/app/_acciones/events/actions')

    expect(await uploadGuestPhotoAction({ status: 'idle', message: '' }, form())).toEqual({
      status: 'error',
      message: 'not_found',
    })
    expect(saveFromGuest).not.toHaveBeenCalled()
  })

  it('con el evento cerrado por contraseña no escribe, aunque el enlace sea bueno', async () => {
    // Es la lección de `respondAction`: el candado cierra las escrituras, no solo el
    // render. Con el enlace en la mano se podía confirmar por POST en un evento «privado».
    passwordHashOf.mockResolvedValue('$argon2id$loquesea')
    const { uploadGuestPhotoAction } = await import('@/app/_acciones/events/actions')

    expect(await uploadGuestPhotoAction({ status: 'idle', message: '' }, form())).toEqual({
      status: 'error',
      message: 'not_found',
    })
    expect(saveFromGuest).not.toHaveBeenCalled()
  })

  it('sin fichero no llama al caso de uso', async () => {
    const { uploadGuestPhotoAction } = await import('@/app/_acciones/events/actions')

    expect(await uploadGuestPhotoAction({ status: 'idle', message: '' }, form({ file: null }))).toEqual({
      status: 'error',
      message: 'no_file',
    })
    expect(saveFromGuest).not.toHaveBeenCalled()
  })

  it('corta a la sexta subida del mismo minuto', async () => {
    // El extremo es público y escribe en disco. El tope por grupo acota cuánto se **queda**,
    // no cuánto entra: sube, borra, vuelve a subir.
    const { uploadGuestPhotoAction } = await import('@/app/_acciones/events/actions')

    for (let intento = 0; intento < 5; intento += 1) {
      expect((await uploadGuestPhotoAction({ status: 'idle', message: '' }, form())).status).toBe('success')
    }

    expect(await uploadGuestPhotoAction({ status: 'idle', message: '' }, form())).toEqual({
      status: 'error',
      message: 'rate_limited',
    })
  })

  it('traslada la clase del fallo del dominio, sin inventarse otra', async () => {
    saveFromGuest.mockResolvedValue({ ok: false, error: 'too_many' })
    const { uploadGuestPhotoAction } = await import('@/app/_acciones/events/actions')

    expect(await uploadGuestPhotoAction({ status: 'idle', message: '' }, form())).toEqual({
      status: 'error',
      message: 'too_many',
    })
  })

  it('si el plan no trae fotos de invitados, no escribe aunque llegue por POST', async () => {
    requireFeature.mockResolvedValue(err({ kind: 'feature_not_included', detail: 'no' }))
    const { uploadGuestPhotoAction } = await import('@/app/_acciones/events/actions')

    expect(await uploadGuestPhotoAction({ status: 'idle', message: '' }, form())).toEqual({ status: 'error', message: 'not_included' })
    expect(requireFeature).toHaveBeenCalledWith('e1', 'guestPhotos')
    expect(saveFromGuest).not.toHaveBeenCalled()
  })
})

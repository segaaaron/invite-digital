import { beforeEach, describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { guestError } from '@/modules/guests/domain/errors'

/**
 * Revocar una invitación es la peor de las acciones que fallaban en silencio: el atelier
 * cree que cortó el acceso a alguien y no lo cortó. Devolver `void` y registrar el fallo
 * en la consola del servidor deja al usuario con la certeza de que funcionó.
 */

const revoke = vi.fn()
const requireSession = vi.fn().mockResolvedValue({ userId: 'u1' })

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// La guardia de multitenencia se deja pasar en estas pruebas: lo que comprueban es el
// comportamiento de la acción, y que la guardia esté puesta lo vigila `pnpm verify:tenancy`
// y la e2e con dos usuarios de verdad.
vi.mock('@/app/_acciones/sesion', () => ({
  requireSession: () => requireSession(),
  requireEventAccess: async () => 'e1',
}))
const importCsv = vi.fn()
const listGroups = vi.fn()
const allowanceFor = vi.fn()
const requireFeature = vi.fn()
const addGuest = vi.fn()
const resend = vi.fn()
const INVITACION_LISTA = { hero: { nameA: 'Camila', nameB: 'Sebastián' }, hosts: { names: ['Luis Paz'], roles: { groomFather: 'Luis Paz' } } }
const contentFor = vi.fn()
const getByIdUnscoped = vi.fn()
const publicarSiBorrador = vi.fn()

vi.mock('@/app/composition/container', () => ({
  guests: {
    revoke: (...args: unknown[]) => revoke(...args),
    list: (...args: unknown[]) => listGroups(...args),
    add: vi.fn(),
    importCsv: (...args: unknown[]) => importCsv(...args),
    addGuest: (...args: unknown[]) => addGuest(...args),
    resend: (...args: unknown[]) => resend(...args),
  },
  events: {
    contentFor: (...args: unknown[]) => contentFor(...args),
    publicarSiBorrador: (...args: unknown[]) => publicarSiBorrador(...args),
    getByIdUnscoped: (...args: unknown[]) => getByIdUnscoped(...args),
    contenidoEscrito: (...args: unknown[]) => contentFor(...args),
  },
  plans: { allowanceFor: (...args: unknown[]) => allowanceFor(...args), requireFeature: (...args: unknown[]) => requireFeature(...args) },
}))

const form = (): FormData => {
  const fd = new FormData()
  fd.set('groupId', 'g1')
  fd.set('eventSlug', 'boda')
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  requireSession.mockResolvedValue({ userId: 'u1' })
  // Una boda cuyo diseño pinta los nombres y los padres: pide los novios y sus papás.
  getByIdUnscoped.mockResolvedValue(ok({ themeKey: 'boda-sello' }))
  requireFeature.mockResolvedValue(ok({}))
  contentFor.mockResolvedValue(INVITACION_LISTA)
})

describe('revokeInvitationAction', () => {
  it('con la revocación aceptada devuelve el estado de éxito', async () => {
    revoke.mockResolvedValue(ok(undefined))
    const { revokeInvitationAction } = await import('@/app/_acciones/guests/actions')

    expect(await revokeInvitationAction({ status: 'idle' }, form())).toEqual({ status: 'success' })
  })

  it('revoca en el evento que abrió la guardia, no en el que diga el identificador', async () => {
    revoke.mockResolvedValue(ok(undefined))
    const { revokeInvitationAction } = await import('@/app/_acciones/guests/actions')

    await revokeInvitationAction({ status: 'idle' }, form())

    expect(revoke).toHaveBeenCalledWith({ eventId: 'e1', id: 'g1' })
  })

  it('si el caso de uso rechaza, la acción devuelve el error en vez de callárselo', async () => {
    revoke.mockResolvedValue(err(guestError('not_found', 'No existe el grupo g1.')))
    const { revokeInvitationAction } = await import('@/app/_acciones/guests/actions')

    expect(await revokeInvitationAction({ status: 'idle' }, form())).toEqual({
      status: 'error',
      message: 'not_found',
    })
  })

  it('el detalle se queda en el registro del servidor, no en el estado', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    revoke.mockResolvedValue(err(guestError('storage_failure', 'La base no responde en 127.0.0.1.')))
    const { revokeInvitationAction } = await import('@/app/_acciones/guests/actions')

    const state = await revokeInvitationAction({ status: 'idle' }, form())

    expect(state).toEqual({ status: 'error', message: 'storage_failure' })
    expect(spy).toHaveBeenCalledWith('[guests/actions]', 'revocación rechazada', 'storage_failure', 'La base no responde en 127.0.0.1.')
    spy.mockRestore()
  })

  it('exige sesión antes de tocar nada', async () => {
    revoke.mockResolvedValue(ok(undefined))
    const { revokeInvitationAction } = await import('@/app/_acciones/guests/actions')

    await revokeInvitationAction({ status: 'idle' }, form())
    expect(requireSession).toHaveBeenCalled()
  })
})

describe('importGuestsAction y el tope del plan', () => {
  const csvForm = (): FormData => {
    const fd = new FormData()
    fd.set('eventId', 'e1')
    fd.set('eventSlug', 'boda')
    fd.set('csv', 'Familia Rojas;4')
    return fd
  }

  it('si no se puede leer el plan, NO importa: se corta con un error', async () => {
    // Pasar `maxGuestGroups: null` cuando la lectura falla significa «sin límite» en este
    // dominio: un fallo transitorio de base convertiría la importación masiva en un salto
    // del tope del plan, en silencio y con cincuenta grupos de golpe.
    allowanceFor.mockResolvedValue(err(guestError('storage_failure', 'la base no responde')))
    listGroups.mockResolvedValue(ok([]))
    const { importGuestsAction } = await import('@/app/_acciones/guests/actions')

    const estado = await importGuestsAction({ status: 'idle' }, csvForm())

    expect(estado.status).toBe('error')
    expect(importCsv).not.toHaveBeenCalled()
  })

  it('si no se pueden leer los grupos actuales, tampoco importa', async () => {
    // Con `currentGroups: 0` el tope se calcularía desde cero y volvería a saltarse.
    allowanceFor.mockResolvedValue(ok({ planSlug: 'atelier', maxGuestGroups: 2 }))
    listGroups.mockResolvedValue(err(guestError('storage_failure', 'la base no responde')))
    const { importGuestsAction } = await import('@/app/_acciones/guests/actions')

    const estado = await importGuestsAction({ status: 'idle' }, csvForm())

    expect(estado.status).toBe('error')
    expect(importCsv).not.toHaveBeenCalled()
  })

  it('con las dos lecturas buenas, importa con el tope real del plan', async () => {
    allowanceFor.mockResolvedValue(ok({ planSlug: 'atelier', maxGuestGroups: 2 }))
    listGroups.mockResolvedValue(ok([{ id: 'g1' }]))
    importCsv.mockResolvedValue(ok({ rows: [], created: 0, rejected: 0 }))
    const { importGuestsAction } = await import('@/app/_acciones/guests/actions')

    await importGuestsAction({ status: 'idle' }, csvForm())

    expect(importCsv).toHaveBeenCalledWith(
      expect.objectContaining({ allowance: { maxGuestGroups: 2 }, currentGroups: 1 }),
    )
  })

  it('si el plan no trae importar la lista, no importa aunque llegue por POST', async () => {
    requireFeature.mockResolvedValue(err({ kind: 'feature_not_included', detail: 'Tu plan no incluye importar la lista de invitados.' }))
    allowanceFor.mockResolvedValue(ok({ planSlug: 'atelier', maxGuestGroups: 2 }))
    listGroups.mockResolvedValue(ok([]))
    const { importGuestsAction } = await import('@/app/_acciones/guests/actions')

    const estado = await importGuestsAction({ status: 'idle' }, csvForm())

    expect(estado.status).toBe('error')
    expect(requireFeature).toHaveBeenCalledWith('e1', 'csvImport')
    expect(importCsv).not.toHaveBeenCalled()
  })
})

/**
 * Se invita aunque la invitación no esté escrita (6 de octubre, decisión del usuario): lo que no
 * se llenó, el invitado lo ve como lo trae el diseño. Antes se cortaba aquí.
 */
describe('se cargan invitados aunque la invitación no esté escrita', () => {
  it('el alta de invitado pasa con el contenido vacío', async () => {
    contentFor.mockResolvedValue({})
    addGuest.mockResolvedValue(ok({ id: 'g1' }))
    allowanceFor.mockResolvedValue(ok({ maxGuestGroups: null }))
    listGroups.mockResolvedValue(ok([]))
    const { addGuestAction } = await import('@/app/_acciones/guests/actions')
    const fd = new FormData()
    fd.set('eventId', 'e1')
    fd.set('eventSlug', 'boda')
    fd.set('fullName', 'Yasmin')

    expect((await addGuestAction({ status: 'idle', message: '' }, fd)).status).toBe('success')
    expect(addGuest).toHaveBeenCalled()
  })

  it('pero enviar pide quién celebra y sus papás (13 oct)', async () => {
    contentFor.mockResolvedValue({})
    resend.mockResolvedValue(ok({ token: 't', label: 'Yasmin' }))
    const { resendInvitationAction } = await import('@/app/_acciones/guests/actions')

    expect((await resendInvitationAction({ status: 'idle' }, form())).status).toBe('error')
    expect(resend).not.toHaveBeenCalled()
  })
})

/**
 * Preparar el enlace es mandar la invitación. Con la invitación escrita no hace falta que
 * nadie la apruebe: se publica sola, y el enlace abre.
 */
describe('preparar un enlace publica la invitación', () => {
  it('publica el evento y después prepara el enlace', async () => {
    const orden: string[] = []
    publicarSiBorrador.mockImplementation(async () => void orden.push('publicar'))
    resend.mockImplementation(async () => {
      orden.push('enlace')
      return ok({ token: 't', label: 'Yasmin' })
    })
    const { resendInvitationAction } = await import('@/app/_acciones/guests/actions')

    const estado = await resendInvitationAction({ status: 'idle' }, form())

    expect(estado.status).toBe('success')
    expect(publicarSiBorrador).toHaveBeenCalledWith('e1')
    expect(orden).toEqual(['publicar', 'enlace'])
  })

  it('sin los novios ni sus papás no se reparte, y lo dice; fecha, lugar y frase no frenan (13 oct)', async () => {
    const { resendInvitationAction } = await import('@/app/_acciones/guests/actions')
    contentFor.mockResolvedValue({ hero: { nameA: 'Camila' } })
    const r = await resendInvitationAction({ status: 'idle' }, form())
    expect(r.status).toBe('error')
    expect(r.status === 'error' && r.message).toBe('Para enviarla falta los nombres de los novios y el nombre de sus papás. Escríbelo en «Personalizar invitación».')
    expect(publicarSiBorrador).not.toHaveBeenCalled()

    contentFor.mockResolvedValue(INVITACION_LISTA)
    resend.mockResolvedValue(ok({ token: 't', label: 'Yasmin' }))
    expect((await resendInvitationAction({ status: 'idle' }, form())).status).toBe('success')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { addGuest } from './add-guest'

/**
 * El alta de invitado crea **su invitación** y lo carga dentro con sus acompañantes. Corre
 * dentro de una transacción (la compone el contenedor): si algo falla devuelve el error y
 * no se guarda nada, así que aquí basta con comprobar que el fallo se devuelve.
 */
const deps = (over: Record<string, unknown> = {}) => {
  const personas: Array<Record<string, unknown>> = []
  const d = {
    addGroup: vi.fn(async (input: { label: string; seats: number }) => ({
      ok: true as const,
      group: { id: 'g1', label: input.label },
      token: 'tok',
    })),
    setPhone: vi.fn(async () => {}),
    addPerson: vi.fn(async (input: Record<string, unknown>) => {
      personas.push(input)
      return { ok: true as const }
    }),
    ...over,
  }
  return { d, personas }
}

const base = {
  eventId: 'e1',
  fullName: 'Ana Lucía Vega',
  attending: null,
  dietaryNote: null,
  phone: null,
  email: null,
  vip: false,
  allowance: { maxGuestGroups: null },
  currentGroups: 1,
}

describe('addGuest', () => {
  it('la invitación se llama como el invitado y tiene un cupo por persona', async () => {
    const { d } = deps()
    const r = await addGuest(d)({ ...base, companionNames: ['Carlos Nieto'] })

    expect(isOk(r)).toBe(true)
    expect(d.addGroup).toHaveBeenCalledWith(expect.objectContaining({ label: 'Ana Lucía Vega', seats: 2 }))
  })

  it('cada acompañante entra con su nombre, marcado como acompañante', async () => {
    const { d, personas } = deps()
    await addGuest(d)({ ...base, companionNames: ['Carlos Nieto', '  ', 'Sofía Nieto'] })

    expect(personas.map((p) => p.fullName)).toEqual(['Ana Lucía Vega', 'Carlos Nieto', 'Sofía Nieto'])
    expect(personas.map((p) => p.isCompanion)).toEqual([false, true, true])
    expect(personas.every((p) => p.guestGroupId === 'g1' && p.eventId === 'e1')).toBe(true)
  })

  it('el teléfono se guarda en la invitación, que es de quien es el enlace', async () => {
    const { d } = deps()
    await addGuest(d)({ ...base, phone: '+59170011122' })

    expect(d.setPhone).toHaveBeenCalledWith('e1', 'g1', '+59170011122')
  })

  it('sin nombre no se crea nada', async () => {
    const { d, personas } = deps()
    const r = await addGuest(d)({ ...base, fullName: '  ' })

    expect(isErr(r)).toBe(true)
    expect(d.addGroup).not.toHaveBeenCalled()
    expect(personas).toHaveLength(0)
  })

  it('el tope del plan devuelve su error y no carga a nadie', async () => {
    const { d, personas } = deps({ addGroup: vi.fn(async () => ({ ok: false as const, message: 'El plan admite 2 invitaciones' })) })
    const r = await addGuest(d)(base)

    expect(isErr(r) && r.error.kind).toBe('plan_limit_reached')
    expect(personas).toHaveLength(0)
  })

  it('si un acompañante no entra, el alta entera falla con el motivo de ese acompañante', async () => {
    // Guardar media familia y decir «hecho» deja a alguien fuera sin que nadie lo sepa;
    // la transacción deshace lo anterior al devolver el error.
    let llamadas = 0
    const { d } = deps({
      addPerson: vi.fn(async () => {
        llamadas += 1
        return llamadas === 2 ? { ok: false as const, kind: 'invalid_label', message: 'Nombre demasiado largo' } : { ok: true as const }
      }),
    })

    const r = await addGuest(d)({ ...base, companionNames: ['X'.repeat(500)] })

    expect(isErr(r) && r.error).toMatchObject({ kind: 'invalid_label', detail: 'Nombre demasiado largo' })
  })
})

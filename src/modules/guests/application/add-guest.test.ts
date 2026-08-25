import { describe, expect, it, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { addGuest } from './add-guest'

const grupoFalso = (over: Record<string, unknown> = {}) => ({
  id: 'g1',
  eventId: 'e1',
  label: 'Familia Rojas',
  seats: 4,
  revokedAt: null,
  invitationSentAt: null,
  phone: null,
  createdAt: new Date(0),
  ...over,
})

const deps = (over: Record<string, unknown> = {}) => {
  const personas: Array<Record<string, unknown>> = []
  const grupos: Array<Record<string, unknown>> = [grupoFalso()]
  return {
    personas,
    grupos,
    deps: {
      addGroup: vi.fn(async (input: { label: string; seats: number }) => {
        const nuevo = grupoFalso({ id: `g${grupos.length + 1}`, label: input.label, seats: input.seats })
        grupos.push(nuevo)
        return { ok: true as const, group: nuevo, token: 'tok' }
      }),
      findGroup: vi.fn(async (id: string) => grupos.find((g) => g.id === id) ?? null),
      setPhone: vi.fn(async () => {}),
      addPerson: vi.fn(async (input: Record<string, unknown>) => {
        personas.push(input)
        return { ok: true as const }
      }),
      ...over,
    },
  }
}

const base = {
  eventId: 'e1',
  fullName: 'Ana Lucía Vega',
  companions: 0,
  attending: null,
  dietaryNote: null,
  phone: null,
  email: null,
  vip: false,
  allowance: { maxGuestGroups: null },
  currentGroups: 1,
}

describe('addGuest', () => {
  it('mete a la persona en el grupo elegido', async () => {
    const { deps: d, personas } = deps()
    const r = await addGuest(d as never)({ ...base, groupId: 'g1' })

    expect(isOk(r)).toBe(true)
    expect(personas).toHaveLength(1)
    expect(personas[0]).toMatchObject({ guestGroupId: 'g1', fullName: 'Ana Lucía Vega' })
    expect(d.addGroup).not.toHaveBeenCalled()
  })

  it('con grupo nuevo lo crea con los cupos que hacen falta: la persona y sus acompañantes', async () => {
    const { deps: d } = deps()
    const r = await addGuest(d as never)({ ...base, newGroupLabel: 'Amigos de Ricardo', companions: 2 })

    expect(isOk(r)).toBe(true)
    expect(d.addGroup).toHaveBeenCalledWith(expect.objectContaining({ label: 'Amigos de Ricardo', seats: 3 }))
  })

  it('los acompañantes entran como personas propias, marcadas como tales', async () => {
    const { deps: d, personas } = deps()
    await addGuest(d as never)({ ...base, newGroupLabel: 'Padrinos', companions: 2 })

    expect(personas).toHaveLength(3)
    expect(personas.filter((p) => p.isCompanion)).toHaveLength(2)
  })

  it('el teléfono se guarda en el grupo, que es de quien es el enlace', async () => {
    const { deps: d } = deps()
    await addGuest(d as never)({ ...base, groupId: 'g1', phone: '+59170011122' })

    expect(d.setPhone).toHaveBeenCalledWith('g1', '+59170011122')
  })

  it('sin grupo elegido ni nombre de grupo nuevo no inventa nada', async () => {
    const { deps: d } = deps()
    const r = await addGuest(d as never)({ ...base })

    expect(isErr(r)).toBe(true)
    expect(d.addGroup).not.toHaveBeenCalled()
  })

  it('si el alta del grupo falla, no se crea ninguna persona suelta', async () => {
    const { deps: d, personas } = deps({
      addGroup: vi.fn(async () => ({ ok: false as const, message: 'El plan admite 2 grupos' })),
    })
    const r = await addGuest(d as never)({ ...base, newGroupLabel: 'Otro' })

    expect(isErr(r)).toBe(true)
    expect(personas).toHaveLength(0)
  })

  it('un acompañante de más que no cabe no tumba el alta de la persona principal', async () => {
    let llamadas = 0
    const { deps: d, personas } = deps({
      addPerson: vi.fn(async (input: Record<string, unknown>) => {
        llamadas += 1
        if (llamadas > 2) return { ok: false as const, message: 'no cabe' }
        personas.push(input)
        return { ok: true as const }
      }),
    })

    const r = await addGuest(d as never)({ ...base, groupId: 'g1', companions: 3 })
    expect(isOk(r)).toBe(true)
    expect(personas).toHaveLength(2)
  })
})

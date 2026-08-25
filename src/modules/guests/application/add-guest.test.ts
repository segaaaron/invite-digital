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
      removeGroup: vi.fn(async (id: string) => {
        const i = grupos.findIndex((g) => g.id === id)
        if (i >= 0) grupos.splice(i, 1)
      }),
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

describe('addGuest · lo que no se puede dejar a medias', () => {
  it('si la persona no entra, el grupo recién creado no se queda huérfano', async () => {
    // Un grupo vacío quema un hueco del plan y acuña un token que nadie verá nunca, y el
    // atelier solo ve «error»: no sabría que hay que borrarlo a mano.
    const { deps: d, grupos } = deps({
      addPerson: vi.fn(async () => ({ ok: false as const, message: 'nombre demasiado largo' })),
    })

    const r = await addGuest(d as never)({ ...base, newGroupLabel: 'Los Nieto' })

    expect(isErr(r)).toBe(true)
    expect(d.removeGroup).toHaveBeenCalled()
    expect(grupos.map((g) => g.label)).not.toContain('Los Nieto')
  })

  it('un grupo que ya existía no se borra aunque la persona falle', async () => {
    const { deps: d, grupos } = deps({
      addPerson: vi.fn(async () => ({ ok: false as const, message: 'no cabe' })),
    })

    await addGuest(d as never)({ ...base, groupId: 'g1' })

    expect(d.removeGroup).not.toHaveBeenCalled()
    expect(grupos).toHaveLength(1)
  })

  it('dice cuántos acompañantes entraron de verdad', async () => {
    let llamadas = 0
    const { deps: d } = deps({
      addPerson: vi.fn(async () => {
        llamadas += 1
        return llamadas > 2 ? { ok: false as const, message: 'no cabe' } : { ok: true as const }
      }),
    })

    const r = await addGuest(d as never)({ ...base, groupId: 'g1', companions: 3 })

    expect(isOk(r)).toBe(true)
    if (!isOk(r)) return
    // Uno de los tres. Decir «hecho» a secas dejaría a dos personas fuera en silencio.
    expect(r.value.companions).toBe(1)
    expect(r.value.requestedCompanions).toBe(3)
  })
})

describe('addGuest · lo que llega mal desde fuera', () => {
  it('no sienta a nadie en un grupo de otro evento', async () => {
    // La acción es un extremo HTTP público: un id de grupo copiado de otra boda no puede
    // meter a una persona ahí. El resto de acciones del salón ya comprueban el evento.
    const { deps: d, personas } = deps({
      findGroup: vi.fn(async () => ({ id: 'g1', eventId: 'otro-evento' })),
    })

    const r = await addGuest(d as never)({ ...base, groupId: 'g1' })

    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error.kind).toBe('not_found')
    expect(personas).toHaveLength(0)
  })

  it('un número de acompañantes que no es número se trata como ninguno', async () => {
    // Con grupo nuevo es donde muerde: los cupos son `1 + acompañantes`, así que un NaN
    // llegaba al dominio y el atelier leía «Cupos inválidos: NaN».
    const { deps: d } = deps()
    const r = await addGuest(d as never)({ ...base, newGroupLabel: 'Los Nieto', companions: Number.NaN })

    expect(isOk(r)).toBe(true)
    expect(d.addGroup).toHaveBeenCalledWith(expect.objectContaining({ seats: 1 }))
  })

  it('un nombre rechazado por el dominio no se disfraza de problema de cupos', async () => {
    const { deps: d } = deps({
      addPerson: vi.fn(async () => ({
        ok: false as const,
        kind: 'invalid_label',
        message: 'La persona necesita un nombre',
      })),
    })

    const r = await addGuest(d as never)({ ...base, groupId: 'g1' })

    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    // Antes todo fallo de la persona salía como `invalid_seats`, y el atelier leía «sube
    // el cupo del grupo» ante un nombre demasiado largo.
    expect(r.error.kind).toBe('invalid_label')
  })
})

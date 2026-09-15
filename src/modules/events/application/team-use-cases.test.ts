import { describe, expect, it } from 'vitest'
import type { Membership } from '@/modules/identity/domain/access'
import { addTeamMember, removeTeamMember, type TeamDeps } from './team-use-cases'

function dobles(usuarios: Array<{ id: string; email: string; role: string }> = []) {
  const miembros: Array<{ eventId: string; userId: string; membership: Membership }> = []
  let n = 0
  const deps: TeamDeps = {
    staff: {
      membershipsOf: async (e, u) => miembros.filter((m) => m.eventId === e && m.userId === u).map((m) => m.membership),
      add: async (e, u, m) => {
        miembros.push({ eventId: e, userId: u, membership: m })
      },
      remove: async (e, u) => {
        const i = miembros.findIndex((m) => m.eventId === e && m.userId === u)
        if (i >= 0) miembros.splice(i, 1)
      },
      countOf: async (e, m) => miembros.filter((x) => x.eventId === e && x.membership === m).length,
    },
    users: {
      findByEmail: async (email) => usuarios.find((u) => u.email === email) ?? null,
      create: async ({ email, role }) => {
        const id = `nuevo${++n}`
        usuarios.push({ id, email, role })
        return { id }
      },
    },
    password: () => 'provisional-de-dieciseis',
  }
  return { deps, miembros, usuarios }
}

describe('addTeamMember', () => {
  it('a un correo nuevo le crea cuenta de cliente con contraseña provisional y lo suma', async () => {
    const { deps, miembros } = dobles()
    const r = await addTeamMember(deps)({ eventId: 'e1', email: ' Mama@Ejemplo.bo ', kind: 'coanfitrion', limite: 1 })
    expect(r).toEqual({ ok: true, email: 'mama@ejemplo.bo', password: 'provisional-de-dieciseis' })
    expect(miembros).toEqual([{ eventId: 'e1', userId: 'nuevo1', membership: 'coanfitrion' }])
  })

  // Escribir el correo de otro no puede servir para cambiarle la contraseña.
  it('a una cuenta que ya existe solo le suma la pertenencia, sin contraseña', async () => {
    const { deps } = dobles([{ id: 'u5', email: 'planner@ejemplo.bo', role: 'atelier' }])
    expect(await addTeamMember(deps)({ eventId: 'e1', email: 'planner@ejemplo.bo', kind: 'planner', limite: 1 })).toEqual({ ok: true, email: 'planner@ejemplo.bo', password: null })
  })

  it('respeta el tope del plan: con cero planners, ninguno', async () => {
    const { deps } = dobles()
    expect(await addTeamMember(deps)({ eventId: 'e1', email: 'p@ejemplo.bo', kind: 'planner', limite: 0 })).toMatchObject({ ok: false })
  })

  it('sin límite (`null`) suma los que hagan falta', async () => {
    const { deps } = dobles()
    for (const email of ['a@x.bo', 'b@x.bo', 'c@x.bo']) {
      expect(await addTeamMember(deps)({ eventId: 'e1', email, kind: 'coanfitrion', limite: null })).toMatchObject({ ok: true })
    }
  })

  // Sumar a quien ya está lo pisaría: el anfitrión quedaría rebajado a co-anfitrión.
  it('quien ya pertenece al evento no se vuelve a sumar', async () => {
    const { deps, miembros } = dobles([{ id: 'u1', email: 'novia@x.bo', role: 'cliente' }])
    miembros.push({ eventId: 'e1', userId: 'u1', membership: 'cliente' })
    expect(await addTeamMember(deps)({ eventId: 'e1', email: 'novia@x.bo', kind: 'coanfitrion', limite: 3 })).toMatchObject({ ok: false })
    expect(miembros[0]?.membership).toBe('cliente')
  })

  it('una cuenta de puerta o de admin no entra al equipo, y un correo mal escrito tampoco', async () => {
    const { deps } = dobles([
      { id: 'p1', email: 'puerta@x.bo', role: 'puerta' },
      { id: 'a1', email: 'jefe@x.bo', role: 'admin' },
    ])
    expect(await addTeamMember(deps)({ eventId: 'e1', email: 'puerta@x.bo', kind: 'planner', limite: 1 })).toMatchObject({ ok: false })
    expect(await addTeamMember(deps)({ eventId: 'e1', email: 'jefe@x.bo', kind: 'planner', limite: 1 })).toMatchObject({ ok: false })
    expect(await addTeamMember(deps)({ eventId: 'e1', email: 'sin-arroba', kind: 'planner', limite: 1 })).toMatchObject({ ok: false })
  })
})

describe('removeTeamMember', () => {
  it('quita co-anfitriones y planners, nunca al anfitrión ni a la puerta', async () => {
    const { deps, miembros } = dobles()
    miembros.push({ eventId: 'e1', userId: 'c', membership: 'coanfitrion' }, { eventId: 'e1', userId: 'a', membership: 'cliente' })
    expect(await removeTeamMember(deps)('e1', 'c')).toEqual({ ok: true })
    expect(await removeTeamMember(deps)('e1', 'a')).toMatchObject({ ok: false })
    expect(miembros.map((m) => m.userId)).toEqual(['a'])
  })
})

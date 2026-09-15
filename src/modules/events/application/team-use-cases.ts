import type { Membership } from '@/modules/identity'

export type TeamDeps = {
  staff: {
    membershipsOf(eventId: string, userId: string): Promise<Membership[]>
    add(eventId: string, userId: string, membership: Membership): Promise<void>
    remove(eventId: string, userId: string): Promise<void>
    countOf(eventId: string, membership: Membership): Promise<number>
  }
  users: {
    findByEmail(email: string): Promise<{ id: string; role: string } | null>
    create(input: { email: string; password: string; role: 'cliente' }): Promise<{ id: string }>
  }
  /** Una contraseña provisional: viaja por correo y el panel obliga a cambiarla al entrar. */
  password: () => string
}

export type TipoDeEquipo = 'coanfitrion' | 'planner'

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NOMBRE: Record<TipoDeEquipo, string> = { coanfitrion: 'co-anfitriones', planner: 'planners' }

/**
 * El anfitrión suma a su equipo. **Una cuenta que ya existe no se toca**: se le suma la
 * pertenencia y nada más; cambiarle la contraseña escribiendo su correo sería robársela. Una
 * nueva nace de cliente con contraseña provisional, que se devuelve **una sola vez**.
 */
export const addTeamMember =
  (deps: TeamDeps) =>
  async (input: {
    eventId: string
    email: string
    kind: TipoDeEquipo
    /** El tope del plan para ese tipo. `null` es sin límite. */
    limite: number | null
  }): Promise<{ ok: true; email: string; password: string | null } | { ok: false; mensaje: string }> => {
    const email = input.email.trim().toLowerCase()
    if (!CORREO.test(email)) return { ok: false, mensaje: 'Escribe un correo válido.' }

    if (input.limite !== null && (await deps.staff.countOf(input.eventId, input.kind)) >= input.limite) {
      return {
        ok: false,
        mensaje: input.limite === 0 ? `Tu plan no incluye ${NOMBRE[input.kind]}.` : `Tu plan admite hasta ${input.limite} ${NOMBRE[input.kind]}.`,
      }
    }

    const existente = await deps.users.findByEmail(email)
    if (existente !== null) {
      if (existente.role === 'puerta' || existente.role === 'admin') {
        return { ok: false, mensaje: 'Ese correo no puede sumarse al equipo. Usa otro.' }
      }
      if ((await deps.staff.membershipsOf(input.eventId, existente.id)).length > 0) {
        return { ok: false, mensaje: 'Esa persona ya está en este evento.' }
      }
      await deps.staff.add(input.eventId, existente.id, input.kind)
      return { ok: true, email, password: null }
    }

    const password = deps.password()
    const { id } = await deps.users.create({ email, password, role: 'cliente' })
    await deps.staff.add(input.eventId, id, input.kind)
    return { ok: true, email, password }
  }

/** Quita a un co-anfitrión o a un planner. Al anfitrión y a la puerta no se les quita desde aquí. */
export const removeTeamMember =
  (deps: Pick<TeamDeps, 'staff'>) =>
  async (eventId: string, userId: string): Promise<{ ok: true } | { ok: false; mensaje: string }> => {
    const clases = await deps.staff.membershipsOf(eventId, userId)
    if (!clases.some((c) => c === 'coanfitrion' || c === 'planner')) return { ok: false, mensaje: 'Esa persona no se puede quitar desde aquí.' }
    await deps.staff.remove(eventId, userId)
    return { ok: true }
  }

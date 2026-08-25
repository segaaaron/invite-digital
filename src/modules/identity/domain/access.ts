/**
 * Quién puede ver y tocar qué.
 *
 * Puro y sin base de datos: las reglas se prueban enteras, y la frontera solo tiene que
 * traer los datos que necesitan.
 */

/**
 * `puerta` es el personal de recepción: registra llegadas y **nada más**. No es un
 * atelier con menos permisos, es otro oficio.
 */
export const ROLES = ['admin', 'atelier', 'puerta'] as const
export type Role = (typeof ROLES)[number]

export type Actor = {
  readonly userId: string
  readonly email: string
  readonly role: Role
}

/**
 * Una fila con un rol que no conocemos —una migración a medias, un valor escrito a
 * mano— cae al rol de **menos** poder. Un rol que se concede por no reconocerlo no es un
 * rol.
 */
export function parseRole(raw: string | null | undefined): Role {
  return (ROLES as readonly string[]).includes(raw ?? '') ? (raw as Role) : 'atelier'
}

export function isAdmin(actor: Actor): boolean {
  return actor.role === 'admin'
}

/**
 * Las secciones de un evento, a efectos de permisos.
 *
 * `full` es todo lo del atelier; `checkin` es la puerta. **`full` es lo que se hereda
 * cuando nadie dice nada**, y `full` deniega a un puerta: el olvido cae del lado seguro,
 * que es la única forma de que una regla de permisos sobreviva a la siguiente sesión.
 */
export type EventSection = 'full' | 'checkin'

/**
 * El evento es suyo, o es admin, o es personal de puerta de **ese** evento y va a la
 * sección de la puerta.
 *
 * Un evento **sin dueño** solo lo ve el admin. No debería existir ninguno —la migración
 * `0021` los asignó todos—, pero la columna es anulable y «sin dueño» no puede
 * significar «de cualquiera».
 */
export function canAccessEvent(
  actor: Actor,
  event: { userId: string | null },
  options: { section?: EventSection | undefined; isStaff?: boolean | undefined } = {},
): boolean {
  const section = options.section ?? 'full'

  if (isAdmin(actor)) return true

  if (actor.role === 'puerta') {
    // La pertenencia y la sección, las dos. Ser personal de una boda no abre la lista de
    // invitados de esa boda, y serlo de una no abre la puerta de otra.
    return section === 'checkin' && options.isStaff === true
  }

  return event.userId !== null && event.userId === actor.userId
}

/** Quién puede dar de alta al personal de puerta de un evento: su dueño, y el admin. */
export function canManageStaff(actor: Actor, event: { userId: string | null }): boolean {
  if (isAdmin(actor)) return true
  return actor.role === 'atelier' && event.userId !== null && event.userId === actor.userId
}

/**
 * Quitarle el rol de admin a alguien.
 *
 * Nadie se lo quita a sí mismo, y no se degrada al último que queda: las dos cosas dejan
 * el sistema sin nadie que administre y sin forma de arreglarlo desde la aplicación.
 */
export function canDemote(actor: Actor, target: { userId: string; adminCount: number }): boolean {
  if (target.userId === actor.userId) return false
  return target.adminCount > 1
}

export type DeleteUserVerdict = { ok: true } | { ok: false; reason: 'tiene_eventos' | 'es_uno_mismo' | 'ultimo_admin' }

/**
 * Borrar un usuario.
 *
 * **Con eventos, no.** La columna es `ON DELETE RESTRICT` y la base lo rechazaría igual;
 * comprobarlo aquí es lo que permite decir *cuántos* tiene en vez de enseñar un error de
 * clave foránea.
 */
export function canDeleteUser(
  actor: Actor,
  target: { userId: string; eventos: number; targetIsAdmin: boolean; adminCount: number },
): DeleteUserVerdict {
  if (target.userId === actor.userId) return { ok: false, reason: 'es_uno_mismo' }
  if (target.eventos > 0) return { ok: false, reason: 'tiene_eventos' }
  // El tope de admins solo aplica si el que se va **es** admin. Borrar a un atelier
  // cuando solo hay un admin es perfectamente normal, y la versión anterior lo bloqueaba.
  if (target.targetIsAdmin && target.adminCount <= 1) return { ok: false, reason: 'ultimo_admin' }
  return { ok: true }
}

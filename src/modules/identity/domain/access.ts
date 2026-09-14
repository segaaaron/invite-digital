/**
 * Quién puede ver y tocar qué.
 *
 * Puro y sin base de datos: las reglas se prueban enteras, y la frontera solo tiene que
 * traer los datos que necesitan.
 */

/**
 * `puerta` es el personal de recepción: registra llegadas y **nada más**. No es un
 * atelier con menos permisos, es otro oficio.
 *
 * `cliente` es quien celebra la boda —los novios, la quinceañera—. Ve su evento y reparte
 * sus invitaciones; no edita el diseño, no toca el plan y no borra nada. **No es el dueño
 * del evento**: el dueño sigue siendo el atelier que lo vendió, porque pasarle la
 * propiedad al cliente dejaría fuera a quien hace el trabajo. Entra por pertenencia, igual
 * que el personal de puerta.
 */
export const ROLES = ['admin', 'atelier', 'puerta', 'cliente'] as const
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
 * `full` es todo lo del atelier; `checkin` es la puerta; `cliente` es lo que ve quien
 * celebra la boda. **`full` es lo que se hereda cuando nadie dice nada**, y `full` deniega
 * tanto a un puerta como a un cliente: el olvido cae del lado seguro, que es la única
 * forma de que una regla de permisos sobreviva a la siguiente sesión.
 */
export type EventSection = 'full' | 'checkin' | 'cliente'

/**
 * La sección con la que cada rol entra a la **carcasa** de un evento.
 *
 * El layout de `(gestion)` envuelve al check-in, al panel del cliente y al del atelier.
 * Pidiendo una sección fija dejaría fuera a dos de los tres antes de llegar a su propia
 * pantalla; el corte fino lo hace cada página declarando la suya.
 */
export function sectionForRole(role: Role): EventSection {
  if (role === 'puerta') return 'checkin'
  if (role === 'cliente') return 'cliente'
  return 'full'
}

/**
 * El evento es suyo, o es admin, o entra por **pertenencia** a la sección de su oficio:
 * el personal de puerta al check-in, el cliente a su panel.
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

  if (actor.role === 'cliente') {
    // Igual que la puerta: pertenencia **y** sección. `full` es Configuración, el plan y
    // el borrado —del atelier— y `checkin` es la puerta, que es otro oficio.
    return section === 'cliente' && options.isStaff === true
  }

  // El atelier dueño entra a todo lo de su evento, la sección del cliente incluida: ve
  // todo lo que ve su cliente, y al revés no.
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

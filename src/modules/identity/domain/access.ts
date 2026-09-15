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
  /**
   * Su contraseña la escribió otro y viajó por correo.
   *
   * Mientras esté puesta, el panel no deja hacer nada más que cambiarla: quien la escribió
   * podría entrar como él.
   */
  readonly mustChangePassword: boolean
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
 * `full` es todo lo del atelier; `checkin` es la puerta; `cliente` es lo que ve el equipo
 * de quien celebra —planificación, invitados, invitación—; `porteros` es sumar gente a la
 * puerta; `equipo` es sumar personas al evento. **`full` es lo que se hereda cuando nadie
 * dice nada**, y `full` deniega a todo el que entra por pertenencia: el olvido cae del lado
 * seguro, que es la única forma de que una regla de permisos sobreviva a la siguiente sesión.
 */
export type EventSection = 'full' | 'checkin' | 'cliente' | 'porteros' | 'equipo'

/**
 * Cómo pertenece alguien a un evento que no es suyo.
 *
 * `cliente` es **el anfitrión**: quien compró —los novios, la quinceañera o sus padres—. La
 * clave se quedó así porque es la de la columna desde `0032`; la pantalla dice «Anfitrión».
 * `coanfitrion` es la otra mitad, una mamá, una hermana; `planner`, la profesional que
 * contrataron; `puerta`, el personal de recepción con cuenta.
 */
export type Membership = 'puerta' | 'cliente' | 'coanfitrion' | 'planner'
export const MEMBERSHIPS: readonly Membership[] = ['puerta', 'cliente', 'coanfitrion', 'planner']

/** Las pertenencias que abren cada sección. Nadie da más permisos de los que tiene. */
const QUIEN_ENTRA: Record<Exclude<EventSection, 'full'>, readonly Membership[]> = {
  checkin: ['puerta'],
  cliente: ['cliente', 'coanfitrion', 'planner'],
  // El anfitrión y su planner suman porteros; el co-anfitrión no.
  porteros: ['cliente', 'planner'],
  // Solo el anfitrión suma personas al evento.
  equipo: ['cliente'],
}

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
 * El evento es suyo, o es admin, o entra por **pertenencia** a lo que su pertenencia abre.
 *
 * El rol `puerta` solo entra al check-in, diga lo que diga la pertenencia: es otro oficio.
 * Cualquier otro rol que no sea dueño entra por su pertenencia —una planner puede tener
 * cuenta de atelier propia y entrar al evento de otro como planner, nunca como dueña—.
 *
 * Un evento **sin dueño** solo lo ve el admin. No debería existir ninguno —la migración
 * `0021` los asignó todos—, pero la columna es anulable y «sin dueño» no puede
 * significar «de cualquiera».
 */
export function canAccessEvent(
  actor: Actor,
  event: { userId: string | null },
  options: { section?: EventSection | undefined; memberships?: readonly Membership[] | undefined } = {},
): boolean {
  const section = options.section ?? 'full'
  const memberships = options.memberships ?? []

  if (isAdmin(actor)) return true

  if (actor.role === 'puerta') return section === 'checkin' && memberships.includes('puerta')

  // El atelier dueño entra a todo lo de su evento: ve todo lo que ve su equipo, y al revés no.
  if (actor.role === 'atelier' && event.userId !== null && event.userId === actor.userId) return true

  if (section === 'full' || section === 'checkin') return false
  return QUIEN_ENTRA[section].some((m) => memberships.includes(m))
}

/** El papel en el equipo de quien entra por pertenencia, para lo que la pantalla le enseña. */
export type RolEnEquipo = 'anfitrion' | 'coanfitrion' | 'planner'
export function rolEnEquipo(memberships: readonly Membership[]): RolEnEquipo | null {
  if (memberships.includes('cliente')) return 'anfitrion'
  if (memberships.includes('planner')) return 'planner'
  if (memberships.includes('coanfitrion')) return 'coanfitrion'
  return null
}

/**
 * Quién da de alta a alguien en un evento: **solo el admin**.
 *
 * Lo hacía también el dueño del evento, y se cerró a propósito: dar de alta **crea una
 * cuenta de usuario** en el sistema y le manda credenciales por correo. Eso no es
 * administrar una boda, es administrar el acceso, y va en un solo sitio.
 *
 * El precio hay que saberlo: la edecán que se contrata la semana de la boda también la
 * da de alta el admin, no el atelier que está en el salón.
 */
export function canManageStaff(actor: Actor): boolean {
  return isAdmin(actor)
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

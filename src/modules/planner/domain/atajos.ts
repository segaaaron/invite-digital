/**
 * Lo que une el plan de tareas con el resto del panel: adónde lleva cada tarea y cuándo la
 * da la app por hecha, porque lo que pide ya se hizo en su pantalla.
 *
 * Por el texto de la tarea, no por una columna: las de la plantilla se reconocen y las que
 * escribe cada quien también, si dicen lo mismo («Contratar fotógrafo»).
 */

export type Atajo = { readonly ruta: string; readonly texto: string }

/** Lo que ya está hecho en el panel. Los proveedores, por su servicio, solo los contratados o reservados. */
export type LoQueYaHay = {
  readonly presupuesto: boolean
  readonly invitacionLista: boolean
  readonly invitacionesRepartidas: boolean
  readonly mesasRepartidas: boolean
  readonly regalos: boolean
  readonly proveedoresContratados: readonly string[]
  readonly cortejo: boolean
  readonly cronograma: boolean
  readonly recepcion: boolean
}

const normal = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

type Regla = {
  readonly si: RegExp
  readonly atajo: Atajo
  /** Cuándo está hecha. Sin esto, la app no puede saberlo y la marca quien la hace. */
  readonly hecha?: (ya: LoQueYaHay, titulo: string) => boolean
}

/** Qué servicio de proveedor resuelve cada «Contratar…» o «Reservar…». */
const SERVICIOS: ReadonlyArray<readonly [RegExp, RegExp]> = [
  [/salon/, /salon|hacienda|jardin|local|hotel/],
  [/fotograf|video/, /fotograf|video|foto/],
  [/catering|menu/, /catering|comida|banquete|menu/],
  [/\bdj\b|musica/, /\bdj\b|musica|banda|orquesta|mariachi/],
  [/coreograf/, /coreograf/],
  [/torta/, /torta|pastel|reposter/],
  [/iglesia|registro civil/, /iglesia|parroquia|registro|notari/],
  [/vestido|traje/, /vestido|modista|traje|sastre|boutique/],
]

const contratado = (ya: LoQueYaHay, titulo: string) => {
  const t = normal(titulo)
  const servicio = SERVICIOS.find(([tarea]) => tarea.test(t))?.[1]
  return servicio !== undefined && ya.proveedoresContratados.some((p) => servicio.test(normal(p)))
}

const PROVEEDORES: Atajo = { ruta: '/planner/proveedores', texto: 'Ir a Proveedores' }

const REGLAS: readonly Regla[] = [
  { si: /fijar la fecha/, atajo: { ruta: '/configuracion', texto: 'Ver la fecha' }, hecha: () => true },
  { si: /presupuesto/, atajo: { ruta: '/planner/presupuesto', texto: 'Ir al Presupuesto' }, hecha: (ya) => ya.presupuesto },
  { si: /pagos finales/, atajo: { ruta: '/planner/presupuesto', texto: 'Ir al Presupuesto' } },
  { si: /terminar la invitacion/, atajo: { ruta: '/configuracion', texto: 'Escribir la invitación' }, hecha: (ya) => ya.invitacionLista },
  { si: /repartir las invitaciones/, atajo: { ruta: '/invitados', texto: 'Ir a Invitados' }, hecha: (ya) => ya.invitacionesRepartidas },
  { si: /no confirmo/, atajo: { ruta: '/invitados', texto: 'Ir a Invitados' } },
  { si: /distribuir las mesas/, atajo: { ruta: '/mesas', texto: 'Ir a Mesas' }, hecha: (ya) => ya.mesasRepartidas },
  { si: /mesa de regalos/, atajo: { ruta: '/regalos', texto: 'Ir a la Mesa de regalos' }, hecha: (ya) => ya.regalos },
  { si: /cronograma|horarios con los proveedores/, atajo: { ruta: '/planner/cronograma', texto: 'Ir al Cronograma' }, hecha: (ya) => ya.cronograma },
  { si: /^(contratar|reservar|encargar la torta|encargar el vestido|elegir vestido)|cerrar el menu|decoracion y show|prueba del vestido/, atajo: PROVEEDORES, hecha: contratado },
  { si: /vals/, atajo: { ruta: '/planner/cortejo', texto: 'Ir al Cortejo' } },
  { si: /ensayo/, atajo: { ruta: '/planner/cortejo', texto: 'Ir al Cortejo' } },
  { si: /padrinos|chambelanes|corte de honor/, atajo: { ruta: '/planner/cortejo', texto: 'Ir al Cortejo' }, hecha: (ya) => ya.cortejo },
  { si: /recepcion y mandarle su acceso|personal de recepcion|porteros/, atajo: { ruta: '/equipo', texto: 'Ir a Equipo' }, hecha: (ya) => ya.recepcion },
]

const reglaDe = (titulo: string) => REGLAS.find((r) => r.si.test(normal(titulo)))

/** Adónde lleva la tarea, relativo al evento (`/planner/proveedores`), o `null`. */
export const atajoDeTarea = (titulo: string): Atajo | null => reglaDe(titulo)?.atajo ?? null

/** Si lo que pide la tarea ya está hecho en el panel. */
export const resueltaEnLaApp = (titulo: string, ya: LoQueYaHay): boolean => reglaDe(titulo)?.hecha?.(ya, titulo) ?? false

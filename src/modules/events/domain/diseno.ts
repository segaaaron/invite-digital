import { err, ok, type Result } from '@/shared/result'

/**
 * El diseño **por encargo**: el cliente reserva, nos da sus datos y nosotros diseñamos.
 *
 * ```
 * esperando_datos ──cliente envía──► en_diseno ──equipo envía versión──► version_enviada ──aprueba──► aprobada
 *                                        ▲                                      │
 *                                        └────────── pide cambios (ronda) ──────┘
 * ```
 *
 * Una **ronda** es un solo mensaje con todos los cambios juntos. Las incluidas se copian del plan
 * al empezar (editar el plan no cambia lo vendido). Un error nuestro no cuenta: el equipo la
 * devuelve. Sin rondas, cada cambio es un extra.
 *
 * Un evento sin fila de diseño es de autoservicio: el cliente escribe su invitación y reparte.
 */
export const ESTADOS_DE_DISENO = ['esperando_datos', 'en_diseno', 'version_enviada', 'aprobada'] as const
export type EstadoDeDiseno = (typeof ESTADOS_DE_DISENO)[number]

export type Diseno = {
  readonly estado: EstadoDeDiseno
  readonly rondasIncluidas: number
  readonly rondasUsadas: number
  readonly diasDeEntrega: number
  /** Para cuándo prometimos la versión que se está haciendo (`aaaa-mm-dd`, Bolivia). */
  readonly entregaHasta: string | null
}

export type ErrorDeDiseno = 'paso_invalido' | 'sin_rondas'

/** Días para devolver una ronda de cambios: son ajustes, no un diseño nuevo. */
export const DIAS_POR_RONDA = 2

const sumarDias = (iso: string, dias: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10)

export const esEstadoDeDiseno = (valor: string): valor is EstadoDeDiseno => (ESTADOS_DE_DISENO as readonly string[]).includes(valor)

export function enviarADiseno(d: Diseno, hoy: string): Result<Diseno, ErrorDeDiseno> {
  if (d.estado !== 'esperando_datos') return err('paso_invalido')
  return ok({ ...d, estado: 'en_diseno', entregaHasta: sumarDias(hoy, d.diasDeEntrega) })
}

export function marcarVersionEnviada(d: Diseno): Result<Diseno, ErrorDeDiseno> {
  if (d.estado !== 'en_diseno') return err('paso_invalido')
  return ok({ ...d, estado: 'version_enviada', entregaHasta: null })
}

export function pedirCambios(d: Diseno, hoy: string): Result<Diseno, ErrorDeDiseno> {
  if (d.estado !== 'version_enviada') return err('paso_invalido')
  if (d.rondasUsadas >= d.rondasIncluidas) return err('sin_rondas')
  return ok({ ...d, estado: 'en_diseno', rondasUsadas: d.rondasUsadas + 1, entregaHasta: sumarDias(hoy, DIAS_POR_RONDA) })
}

export function aprobarVersion(d: Diseno): Result<Diseno, ErrorDeDiseno> {
  if (d.estado !== 'version_enviada') return err('paso_invalido')
  return ok({ ...d, estado: 'aprobada', entregaHasta: null })
}

/** «Error nuestro»: la ronda no cuenta. */
export const descontarRonda = (d: Diseno): Diseno => ({ ...d, rondasUsadas: Math.max(0, d.rondasUsadas - 1) })

/**
 * Si se pueden repartir los enlaces. Por encargo, solo con la versión aprobada **y el saldo
 * pagado**: «pagas el saldo y la compartes». Sin encargo (`null`), como siempre.
 */
export function puedeRepartir(d: Diseno | null, cobro: { saldoPendiente: boolean }): boolean {
  if (d === null) return true
  return d.estado === 'aprobada' && !cobro.saldoPendiente
}

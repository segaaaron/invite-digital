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
  /** Lo que el cliente contó en el formulario de su plan (temática, vestido…), si lo contó. */
  readonly brief?: BriefDelEncargo | null
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

/**
 * Lo que el formulario de datos pide **según el plan** (documento de cambios, sección 7): en Gala,
 * qué secciones quitar, agregar u ordenar; en Imperial además la temática, el vestido, la
 * decoración y las flores, con lo que diseñamos «creado para ti». El resto de datos se escribe en
 * la invitación y las fotos llegan por WhatsApp.
 */
export const PREGUNTAS_DEL_ENCARGO = ['secciones', 'tematica', 'vestido', 'decoracion', 'flores'] as const
export type PreguntaDelEncargo = (typeof PREGUNTAS_DEL_ENCARGO)[number]
export type BriefDelEncargo = Partial<Record<PreguntaDelEncargo, string>>

/** Tope de cada respuesta: una descripción, no un documento. */
export const MAX_RESPUESTA_DEL_ENCARGO = 1000

/** Qué se le pregunta a cada plan: con «Colores y letra», las secciones; con el planner total, todo. */
export function preguntasDelEncargo(plan: { readonly estilo: boolean; readonly creadoParaTi: boolean }): readonly PreguntaDelEncargo[] {
  if (plan.creadoParaTi) return PREGUNTAS_DEL_ENCARGO
  return plan.estilo ? ['secciones'] : []
}

/** Las respuestas, limpias: sin espacios de sobra, sin vacías y solo las preguntas que existen. */
export function leerBrief(valor: (pregunta: PreguntaDelEncargo) => string | null): Result<BriefDelEncargo, 'texto_largo'> {
  const brief: BriefDelEncargo = {}
  for (const pregunta of PREGUNTAS_DEL_ENCARGO) {
    const texto = (valor(pregunta) ?? '').trim()
    if (texto === '') continue
    if (texto.length > MAX_RESPUESTA_DEL_ENCARGO) return err('texto_largo')
    brief[pregunta] = texto
  }
  return ok(brief)
}

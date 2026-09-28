import { diasEntre } from './hoy'
import { PLAZOS, type FiestaDeSalud } from './salud'

/**
 * **Lo que el mantenimiento diario le manda a cada anfitrión, y cuándo** (28 de septiembre). Un
 * planner acompaña: recuerda escribir la invitación a tiempo, empuja el reparto, avisa si el
 * cierre se acerca con pocas respuestas, pide la opinión después de la fiesta y felicita al año.
 *
 * Cada aviso sale **una sola vez** por evento (`event_notices`). Puro: la fecha llega como argumento.
 */
export const AVISOS = ['hito-escribir', 'hito-repartir', 'rsvp-bajo', 'encuesta', 'aniversario'] as const
export type Aviso = (typeof AVISOS)[number]

export type EventoParaAvisar = {
  readonly fiesta: FiestaDeSalud
  readonly eventDate: string
  readonly rsvpDeadline: string
  readonly invitacionEscrita: boolean
  readonly grupos: number
  readonly enviados: number
  readonly respondidos: number
  /** Los que ya se mandaron. */
  readonly yaEnviados: ReadonlySet<string>
}

/** Por debajo de esto, a una semana del cierre, conviene recordar a los que faltan. */
const RESPUESTA_BAJA = 0.6
/** Días antes del cierre en que se mira si faltan respuestas. */
const ANTES_DEL_CIERRE = 7
/** La encuesta sale entre el tercer y el décimo día después: ni al día siguiente, ni tan tarde. */
const ENCUESTA = { desde: 3, hasta: 10 }
/** El aniversario, en la semana del año cumplido. */
const ANIVERSARIO = { desde: 365, hasta: 372 }

export function avisosDeHoy(e: EventoParaAvisar, hoy: string): Aviso[] {
  const dias = diasEntre(hoy, e.eventDate)
  const alCierre = diasEntre(hoy, e.rsvpDeadline)
  const plazo = PLAZOS[e.fiesta]
  const toca: Aviso[] = []

  if (dias > 0 && dias <= plazo.escribir && !e.invitacionEscrita) toca.push('hito-escribir')
  if (dias > 0 && dias <= plazo.repartir && e.invitacionEscrita && (e.grupos === 0 || e.enviados / e.grupos < 0.5)) toca.push('hito-repartir')
  if (alCierre >= 0 && alCierre <= ANTES_DEL_CIERRE && e.grupos > 0 && e.enviados > 0 && e.respondidos / e.grupos < RESPUESTA_BAJA) toca.push('rsvp-bajo')
  if (-dias >= ENCUESTA.desde && -dias <= ENCUESTA.hasta) toca.push('encuesta')
  if (-dias >= ANIVERSARIO.desde && -dias <= ANIVERSARIO.hasta) toca.push('aniversario')

  return toca.filter((a) => !e.yaEnviados.has(a))
}

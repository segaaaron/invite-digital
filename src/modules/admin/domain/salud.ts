import { diasEntre } from './hoy'

/**
 * **La salud de un evento**: si va a llegar bien a su fecha, con la razón en palabras.
 *
 * Los plazos son los del oficio de un planner. Una boda se escribe y se reparte antes que unos
 * XV: los invitados de una boda viajan, piden permiso y compran regalo. Puro: la fecha llega como
 * argumento, como en `hoy.ts`.
 */
export type FiestaDeSalud = 'boda' | 'xv' | 'cumple'
export type TonoDeSalud = 'ok' | 'warn' | 'risk'

export const PLAZOS: Readonly<Record<FiestaDeSalud, { escribir: number; repartir: number }>> = {
  // Días antes del evento en los que la invitación ya tiene que estar escrita y repartiéndose.
  boda: { escribir: 70, repartir: 42 },
  xv: { escribir: 56, repartir: 35 },
  cumple: { escribir: 42, repartir: 28 },
}
/** Por debajo de esto, pasado el cierre, las confirmaciones van mal. */
const RESPUESTA_SANA = 0.7
/** Por debajo de esto, a seis semanas, el reparto va tarde. */
const REPARTO_SANO = 0.5
/** A partir de cuántos días antes el saldo sin cobrar preocupa. */
const SALDO_URGENTE = 30

export type EventoDeSalud = {
  readonly fiesta: FiestaDeSalud
  readonly eventDate: string
  readonly rsvpDeadline: string
  readonly grupos: number
  readonly enviados: number
  readonly respondidos: number
  readonly invitacionEscrita: boolean
  readonly clienteSinEntrar: boolean
  readonly saldoPendiente: boolean
}

export type AlertaDeSalud = { readonly clave: string; readonly tono: Exclude<TonoDeSalud, 'ok'>; readonly texto: string }
export type Salud = { readonly tono: TonoDeSalud; readonly texto: string; readonly alertas: readonly AlertaDeSalud[] }

const faltan = (dias: number) => (dias === 0 ? 'es hoy' : dias === 1 ? 'es mañana' : `faltan ${dias} días`)
const pct = (x: number) => `${Math.round(x * 100)} %`

export function saludDelEvento(e: EventoDeSalud, hoy: string): Salud {
  const dias = diasEntre(hoy, e.eventDate)
  if (dias < 0) return { tono: 'ok', texto: 'Celebrado', alertas: [] }
  const plazo = PLAZOS[e.fiesta]
  const alertas: AlertaDeSalud[] = []

  if (!e.invitacionEscrita && dias <= plazo.escribir) alertas.push({ clave: 'sin-escribir', tono: 'risk', texto: `Invitación sin escribir · ${faltan(dias)}` })
  if (e.grupos === 0 && dias <= plazo.repartir) alertas.push({ clave: 'sin-invitados', tono: 'risk', texto: `Sin invitados cargados · ${faltan(dias)}` })
  if (e.grupos > 0 && dias <= plazo.repartir && e.enviados / e.grupos < REPARTO_SANO) {
    alertas.push({ clave: 'reparto', tono: 'risk', texto: `Solo ${e.enviados} de ${e.grupos} invitaciones enviadas · ${faltan(dias)}` })
  }
  if (e.grupos > 0 && diasEntre(hoy, e.rsvpDeadline) < 0 && e.respondidos / e.grupos < RESPUESTA_SANA) {
    alertas.push({ clave: 'rsvp', tono: 'warn', texto: `Cerró la confirmación y respondió el ${pct(e.respondidos / e.grupos)}` })
  }
  if (e.clienteSinEntrar) alertas.push({ clave: 'sin-entrar', tono: 'warn', texto: 'El cliente todavía no entró a su panel' })
  if (e.saldoPendiente && dias <= SALDO_URGENTE) alertas.push({ clave: 'saldo', tono: 'warn', texto: `Saldo sin cobrar · ${faltan(dias)}` })

  // Lo grave primero: el semáforo dice lo peor y su razón.
  const ordenadas = [...alertas].sort((a, b) => Number(b.tono === 'risk') - Number(a.tono === 'risk'))
  const peor = ordenadas[0]
  if (peor === undefined) return { tono: 'ok', texto: e.grupos === 0 ? 'En preparación' : `Al día · respondió el ${pct(e.respondidos / e.grupos)}`, alertas: [] }
  return { tono: peor.tono, texto: peor.texto, alertas: ordenadas }
}

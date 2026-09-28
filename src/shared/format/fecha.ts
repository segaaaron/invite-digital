/**
 * Fechas del panel que se pintan igual en el servidor y en el navegador.
 *
 * `toLocaleString` no sirve en un componente que se hidrata: Node y Chrome traen versiones
 * distintas de ICU —«29 de agosto, 02:08 p. m.» en uno, «29 de agosto a las 02:08 p. m.»
 * en el otro— y sin `timeZone` el servidor escribe la hora UTC y el navegador la local.
 * React descarta el HTML y repinta el árbol entero. Aquí se toman **las piezas** y se
 * componen a mano, siempre en la hora de Bolivia.
 */
const PIEZAS = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'America/La_Paz',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const pieza = (partes: Intl.DateTimeFormatPart[], tipo: Intl.DateTimeFormatPartTypes): string =>
  partes.find((p) => p.type === tipo)?.value ?? ''

/** «29 de agosto · 14:08», en hora de Bolivia. */
export function fechaHora(instante: Date): string {
  const partes = PIEZAS.formatToParts(instante)
  return `${pieza(partes, 'day')} de ${pieza(partes, 'month')} · ${pieza(partes, 'hour')}:${pieza(partes, 'minute')}`
}

/** «29 de agosto», en hora de Bolivia. */
export function fecha(instante: Date): string {
  const partes = PIEZAS.formatToParts(instante)
  return `${pieza(partes, 'day')} de ${pieza(partes, 'month')}`
}

/** «14:08», en hora de Bolivia. */
export function hora(instante: Date): string {
  const partes = PIEZAS.formatToParts(instante)
  return `${pieza(partes, 'hour')}:${pieza(partes, 'minute')}`
}

/**
 * «19-sept», en hora de Bolivia: la fecha corta de las listas del panel.
 *
 * Con `timeZone: 'UTC'` —como estaba— toda respuesta dada **después de las 20:00** en
 * Bolivia salía con la fecha del día siguiente: a esa hora allí ya es mañana en UTC.
 */
const PIEZAS_CORTAS = new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short' })

export function fechaCorta(instante: Date): string {
  const partes = PIEZAS_CORTAS.formatToParts(instante)
  return `${pieza(partes, 'day')}-${pieza(partes, 'month')}`
}


/**
 * Las fechas **de un día** —la del evento, la del cierre— se guardan como `2026-12-05`, sin
 * hora. Se leen en UTC a propósito: son un día de calendario, no un instante, y leerlas en la
 * zona del servidor las correría un día.
 */
const DIA_ENTERO = new Intl.DateTimeFormat('es-BO', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

const sinPunto = (texto: string): string => texto.replace('.', '')
const deIso = (iso: string): Date => new Date(`${iso}T00:00:00Z`)

/** «sáb 5 dic 2026»: la fecha de un evento, en el panel. Nunca ISO en pantalla. */
export function diaDelEvento(iso: string): string {
  const partes = DIA_ENTERO.formatToParts(deIso(iso))
  return `${sinPunto(pieza(partes, 'weekday'))} ${pieza(partes, 'day')} ${sinPunto(pieza(partes, 'month'))} ${pieza(partes, 'year')}`
}

/** «5 dic»; con el año si no es el de `hoy` (ISO), para que «14 feb» no engañe. */
export function diaCorto(iso: string, hoy?: string): string {
  const partes = DIA_ENTERO.formatToParts(deIso(iso))
  const base = `${pieza(partes, 'day')} ${sinPunto(pieza(partes, 'month'))}`
  return hoy === undefined || hoy.slice(0, 4) === iso.slice(0, 4) ? base : `${base} ${pieza(partes, 'year')}`
}

/** «ahora», «hace 40 min», «hace 3 h», «ayer», «hace 8 días»: cuánto lleva algo esperando. */
export function hace(instante: Date, ahora: Date): string {
  const minutos = Math.floor((ahora.getTime() - instante.getTime()) / 60_000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'ayer' : `hace ${dias} días`
}

/** «hoy», «mañana», «en 14 días», «en 3 meses», «hace 1 año»: la distancia a un evento, en días. */
export function faltaPara(dias: number): string {
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias === -1) return 'ayer'
  const n = Math.abs(dias)
  const anos = Math.round(n / 365)
  const texto = n < 45 ? `${n} días` : n < 365 ? `${Math.round(n / 30)} meses` : `${anos} año${anos === 1 ? '' : 's'}`
  return dias > 0 ? `en ${texto}` : `hace ${texto}`
}

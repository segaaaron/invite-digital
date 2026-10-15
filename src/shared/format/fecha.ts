/**
 * Fechas del panel que se pintan igual en el servidor y en el navegador.
 *
 * `toLocaleString` no sirve en un componente que se hidrata: Node y Chrome traen versiones
 * distintas de ICU —«29 de agosto, 02:08 p. m.» en uno, «29 de agosto a las 02:08 p. m.»
 * en el otro— y sin `timeZone` el servidor escribe la hora UTC y el navegador la local.
 * React descarta el HTML y repinta el árbol entero. Aquí se toman **las piezas** y se
 * componen a mano, siempre en la hora de Bolivia.
 */
import type { Locale } from '@/shared/i18n/locales'
import { INTL } from '@/shared/i18n/t'

/** Un formateador por idioma, creado una vez (crear un `Intl.DateTimeFormat` cuesta). */
const porIdioma = (opciones: Intl.DateTimeFormatOptions): Record<Locale, Intl.DateTimeFormat> => ({
  es: new Intl.DateTimeFormat(INTL.es, opciones),
  en: new Intl.DateTimeFormat(INTL.en, opciones),
})

const PIEZAS = porIdioma({
  timeZone: 'America/La_Paz',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const DIA_EN_BOLIVIA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/La_Paz',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * El día de hoy **en Bolivia**, `aaaa-mm-dd`. El servidor corre en UTC: a las ocho de la noche
 * de La Paz ya es mañana allí, y un plazo «hasta el 20» se cerraría cuatro horas antes.
 */
export const fechaEnBolivia = (instante: Date): string => DIA_EN_BOLIVIA.format(instante)

const pieza = (partes: Intl.DateTimeFormatPart[], tipo: Intl.DateTimeFormatPartTypes): string =>
  partes.find((p) => p.type === tipo)?.value ?? ''

/** «29 de agosto» / «August 29». */
const diaYMes = (partes: Intl.DateTimeFormatPart[], locale: Locale): string =>
  locale === 'es' ? `${pieza(partes, 'day')} de ${pieza(partes, 'month')}` : `${pieza(partes, 'month')} ${pieza(partes, 'day')}`

/** «29 de agosto · 14:08» («August 29 · 14:08»), en hora de Bolivia. */
export function fechaHora(instante: Date, locale: Locale = 'es'): string {
  const partes = PIEZAS[locale].formatToParts(instante)
  return `${diaYMes(partes, locale)} · ${pieza(partes, 'hour')}:${pieza(partes, 'minute')}`
}

/** «29 de agosto» («August 29»), en hora de Bolivia. */
export function fecha(instante: Date, locale: Locale = 'es'): string {
  return diaYMes(PIEZAS[locale].formatToParts(instante), locale)
}

/** «14:08», en hora de Bolivia. */
export function hora(instante: Date): string {
  const partes = PIEZAS.es.formatToParts(instante)
  return `${pieza(partes, 'hour')}:${pieza(partes, 'minute')}`
}

/**
 * «19-sept» («19-Sep»), en hora de Bolivia: la fecha corta de las listas del panel.
 *
 * Con `timeZone: 'UTC'` —como estaba— toda respuesta dada **después de las 20:00** en
 * Bolivia salía con la fecha del día siguiente: a esa hora allí ya es mañana en UTC.
 */
const PIEZAS_CORTAS = porIdioma({ timeZone: 'America/La_Paz', day: '2-digit', month: 'short' })

export function fechaCorta(instante: Date, locale: Locale = 'es'): string {
  const partes = PIEZAS_CORTAS[locale].formatToParts(instante)
  return `${pieza(partes, 'day')}-${pieza(partes, 'month')}`
}


/**
 * Las fechas **de un día** —la del evento, la del cierre— se guardan como `2026-12-05`, sin
 * hora. Se leen en UTC a propósito: son un día de calendario, no un instante, y leerlas en la
 * zona del servidor las correría un día.
 */
const DIA_ENTERO = porIdioma({ timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

const sinPunto = (texto: string): string => texto.replace('.', '')
const deIso = (iso: string): Date => new Date(`${iso}T00:00:00Z`)

/** «sáb 5 dic 2026» («Sat Dec 5 2026»): la fecha de un evento, en el panel. Nunca ISO en pantalla. */
export function diaDelEvento(iso: string, locale: Locale = 'es'): string {
  const partes = DIA_ENTERO[locale].formatToParts(deIso(iso))
  const [dia, mes] = [pieza(partes, 'day'), sinPunto(pieza(partes, 'month'))]
  return `${sinPunto(pieza(partes, 'weekday'))} ${locale === 'es' ? `${dia} ${mes}` : `${mes} ${dia}`} ${pieza(partes, 'year')}`
}

/** «5 dic» («Dec 5»); con el año si no es el de `hoy` (ISO), para que «14 feb» no engañe. */
export function diaCorto(iso: string, hoy?: string, locale: Locale = 'es'): string {
  const partes = DIA_ENTERO[locale].formatToParts(deIso(iso))
  const [dia, mes] = [pieza(partes, 'day'), sinPunto(pieza(partes, 'month'))]
  const base = locale === 'es' ? `${dia} ${mes}` : `${mes} ${dia}`
  return hoy === undefined || hoy.slice(0, 4) === iso.slice(0, 4) ? base : `${base} ${pieza(partes, 'year')}`
}

/** «ahora», «hace 40 min», «hace 3 h», «ayer», «hace 8 días»: cuánto lleva algo esperando. */
export function hace(instante: Date, ahora: Date, locale: Locale = 'es'): string {
  const es = locale === 'es'
  const minutos = Math.floor((ahora.getTime() - instante.getTime()) / 60_000)
  if (minutos < 1) return es ? 'ahora' : 'just now'
  if (minutos < 60) return es ? `hace ${minutos} min` : `${minutos} min ago`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return es ? `hace ${horas} h` : `${horas} h ago`
  const dias = Math.floor(horas / 24)
  if (dias === 1) return es ? 'ayer' : 'yesterday'
  return es ? `hace ${dias} días` : `${dias} days ago`
}

/** «hoy», «mañana», «en 14 días», «en 3 meses», «hace 1 año»: la distancia a un evento, en días. */
export function faltaPara(dias: number, locale: Locale = 'es'): string {
  const es = locale === 'es'
  if (dias === 0) return es ? 'hoy' : 'today'
  if (dias === 1) return es ? 'mañana' : 'tomorrow'
  if (dias === -1) return es ? 'ayer' : 'yesterday'
  const n = Math.abs(dias)
  const anos = Math.round(n / 365)
  const meses = Math.round(n / 30)
  const texto = es
    ? n < 45 ? `${n} días` : n < 365 ? `${meses} meses` : `${anos} año${anos === 1 ? '' : 's'}`
    : n < 45 ? `${n} days` : n < 365 ? `${meses} months` : `${anos} year${anos === 1 ? '' : 's'}`
  return es ? (dias > 0 ? `en ${texto}` : `hace ${texto}`) : dias > 0 ? `in ${texto}` : `${texto} ago`
}

const DIA_LARGO = porIdioma({ timeZone: 'America/La_Paz', weekday: 'long', day: 'numeric', month: 'long' })
const DIA_DE_FIESTA = porIdioma({ timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'long' })

/** «Lunes 12 de octubre» («Monday, October 12»): hoy en Bolivia, como lo dice la barra de arriba del admin. */
export function diaLargo(instante: Date, locale: Locale = 'es'): string {
  const partes = DIA_LARGO[locale].formatToParts(instante)
  const dia = pieza(partes, 'weekday')
  return locale === 'es' ? `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${diaYMes(partes, locale)}` : `${dia}, ${diaYMes(partes, locale)}`
}

/** «sáb 18 de octubre» («Sat, October 18»): el día de una fiesta (`aaaa-mm-dd`), bajo su nombre en la barra. */
export function diaDeLaFiesta(iso: string, locale: Locale = 'es'): string {
  const partes = DIA_DE_FIESTA[locale].formatToParts(deIso(iso))
  return locale === 'es' ? `${sinPunto(pieza(partes, 'weekday'))} ${diaYMes(partes, locale)}` : `${pieza(partes, 'weekday')}, ${diaYMes(partes, locale)}`
}

/** Días de calendario de hoy (Bolivia) a una fecha `aaaa-mm-dd`: negativos si ya pasó. */
export function diasHasta(iso: string, ahora: Date): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${fechaEnBolivia(ahora)}T00:00:00Z`)) / 86_400_000)
}

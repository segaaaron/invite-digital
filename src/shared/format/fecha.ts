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

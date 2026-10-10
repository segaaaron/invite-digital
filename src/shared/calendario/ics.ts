/**
 * **Calendarios `.ics`** (RFC 5545), a mano: son cuatro reglas —CRLF, escapar `\ ; ,` y saltos, doblar a 75
 * octetos, fechas en UTC— y una librería para eso no se justifica. Lo usan «Agregar a mi calendario» de la
 * invitación y la agenda del panel (descarga y suscripción).
 *
 * Las horas del proyecto son **de Bolivia sin zona** (`2026-12-12T20:00`): UTC−4 todo el año, sin horario de
 * verano, así que se pasan a UTC sumando cuatro horas y se escriben con `Z`. Sin `VTIMEZONE` que mantener.
 */
export type EventoDeCalendario = {
  /** Estable entre descargas: así una suscripción actualiza el evento en vez de duplicarlo. */
  readonly uid: string
  /** Con hora (`YYYY-MM-DDTHH:MM`, Bolivia) o de día entero (`YYYY-MM-DD`). */
  readonly inicio: string
  /** Solo con hora; por defecto, una hora. */
  readonly minutos?: number
  readonly titulo: string
  readonly lugar?: string | null
  readonly descripcion?: string | null
  readonly url?: string | null
  /**
   * Una alarma: con hora, una hora antes; de día entero, la víspera a las 9. **No es la forma de avisar**
   * (9 oct): al suscribirse, el iPhone quita las alertas por defecto y Google no las usa; avisan la campana y
   * el celular. Va para quien mantenga las alertas o descargue el fichero.
   */
  readonly aviso?: boolean
}

const BOLIVIA_MS = 4 * 3_600_000
const conHora = (inicio: string) => inicio.length > 10

/** `2026-12-12T20:00` de Bolivia → `20261213T000000Z`. */
function utc(localBolivia: string, masMinutos = 0): string {
  const [dia, hora = '00:00'] = localBolivia.split('T')
  const [h = '0', m = '0'] = hora.split(':')
  const ms = Date.parse(`${dia}T00:00:00Z`) + (Number(h) * 60 + Number(m) + masMinutos) * 60_000 + BOLIVIA_MS
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

const soloDia = (dia: string, masDias = 0) => new Date(Date.parse(`${dia}T00:00:00Z`) + masDias * 86_400_000).toISOString().slice(0, 10).replace(/-/g, '')

export const escaparIcs = (texto: string) => texto.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Líneas de más de 75 octetos se doblan con CRLF + espacio, sin partir un carácter UTF-8. */
function doblar(linea: string): string {
  const partes: string[] = []
  let actual = ''
  let octetos = 0
  for (const caracter of linea) {
    const n = Buffer.byteLength(caracter)
    if (octetos + n > (partes.length === 0 ? 75 : 74)) {
      partes.push(actual)
      actual = ''
      octetos = 0
    }
    actual += caracter
    octetos += n
  }
  partes.push(actual)
  return partes.join('\r\n ')
}

export function calendarioIcs(nombre: string, eventos: readonly EventoDeCalendario[], ahora: Date): string {
  const sello = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lineas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Luxury Atelier//Agenda//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${escaparIcs(nombre)}`]
  for (const e of eventos) {
    lineas.push('BEGIN:VEVENT', `UID:${e.uid}`, `DTSTAMP:${sello}`)
    if (conHora(e.inicio)) lineas.push(`DTSTART:${utc(e.inicio)}`, `DTEND:${utc(e.inicio, e.minutos ?? 60)}`)
    else lineas.push(`DTSTART;VALUE=DATE:${soloDia(e.inicio)}`, `DTEND;VALUE=DATE:${soloDia(e.inicio, 1)}`)
    lineas.push(`SUMMARY:${escaparIcs(e.titulo)}`)
    if (e.lugar) lineas.push(`LOCATION:${escaparIcs(e.lugar)}`)
    if (e.descripcion) lineas.push(`DESCRIPTION:${escaparIcs(e.descripcion)}`)
    if (e.url) lineas.push(`URL:${e.url}`)
    if (e.aviso) lineas.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escaparIcs(e.titulo)}`, `TRIGGER:${conHora(e.inicio) ? '-PT1H' : '-PT15H'}`, 'END:VALARM')
    lineas.push('END:VEVENT')
  }
  lineas.push('END:VCALENDAR')
  return `${lineas.map(doblar).join('\r\n')}\r\n`
}

/** «Agregar a Google Calendar» sin cuentas ni permisos: el enlace de plantilla de Google. */
export function enlaceDeGoogle(e: EventoDeCalendario): string {
  const fechas = conHora(e.inicio) ? `${utc(e.inicio)}/${utc(e.inicio, e.minutos ?? 60)}` : `${soloDia(e.inicio)}/${soloDia(e.inicio, 1)}`
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.titulo, dates: fechas })
  if (e.lugar) q.set('location', e.lugar)
  const detalle = [e.descripcion, e.url].filter(Boolean).join('\n\n')
  if (detalle) q.set('details', detalle)
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

/** Las respuestas `.ics`: sin caché compartida ni índice; `inline` para que el teléfono lo abra en su calendario. */
export function respuestaIcs(cuerpo: string, archivo: string): Response {
  return new Response(cuerpo, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${archivo}"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}

/**
 * **Los avisos del panel** (28 de septiembre): lo que la campana enseña y lo que llega como
 * notificación push al celular o la computadora. Cada aviso dice una sola cosa, en una línea, y
 * lleva a la pantalla donde se atiende.
 *
 * Puro: sin base, sin reloj y sin red. Quién lo recibe también se decide aquí.
 */

export const TIPOS_DE_AVISO = ['rsvp', 'mensaje', 'apertura', 'regalo', 'agenda', 'venta'] as const
export type TipoDeAviso = (typeof TIPOS_DE_AVISO)[number]

/** Para las preferencias de Mi cuenta: qué es cada tipo, dicho para quien lo recibe. */
export const TIPOS_DE_AVISO_EXPLICADOS: readonly { tipo: TipoDeAviso; titulo: string; ayuda: string; soloAdmin: boolean }[] = [
  { tipo: 'rsvp', titulo: 'Confirmaciones', ayuda: 'Cuando un invitado confirma o dice que no podrá ir.', soloAdmin: false },
  { tipo: 'mensaje', titulo: 'Mensajes', ayuda: 'Cuando alguien firma tu libro de mensajes.', soloAdmin: false },
  { tipo: 'apertura', titulo: 'Invitaciones abiertas', ayuda: 'La primera vez que un invitado abre su invitación.', soloAdmin: false },
  { tipo: 'regalo', titulo: 'Regalos', ayuda: 'Cuando alguien reserva un regalo de tu lista.', soloAdmin: false },
  { tipo: 'agenda', titulo: 'Lo que vence', ayuda: 'Tareas y pagos que vencen mañana, y la semana del evento.', soloAdmin: false },
  { tipo: 'venta', titulo: 'Ventas', ayuda: 'Consultas nuevas y comprobantes por revisar.', soloAdmin: true },
]

export type Aviso = { readonly kind: TipoDeAviso; readonly title: string; readonly body: string; readonly href: string }

type DelEvento = { readonly titulo: string; readonly slug: string }

const MAX_CUERPO = 140
const recortar = (texto: string, max: number): string => {
  const limpio = texto.trim().replace(/\s+/g, ' ')
  return limpio.length <= max ? limpio : `${limpio.slice(0, max - 1).trimEnd()}…`
}
const enEvento = (slug: string, ruta: string) => `/panel/eventos/${slug}${ruta}`

export function avisoDeRespuesta(i: DelEvento & { invitado: string; lugares: number }): Aviso {
  const title =
    i.lugares <= 0 ? `${i.invitado} no podrá asistir` : i.lugares === 1 ? `${i.invitado} confirmó su asistencia` : `${i.invitado} confirmó ${i.lugares} lugares`
  return { kind: 'rsvp', title: recortar(title, 160), body: i.titulo, href: enEvento(i.slug, '/invitados') }
}

export function avisoDeMensaje(i: DelEvento & { invitado: string; texto: string }): Aviso {
  return { kind: 'mensaje', title: recortar(`${i.invitado} te dejó un mensaje`, 160), body: recortar(i.texto, MAX_CUERPO), href: enEvento(i.slug, '/mensajes') }
}

export function avisoDeApertura(i: DelEvento & { invitado: string }): Aviso {
  return { kind: 'apertura', title: recortar(`${i.invitado} abrió su invitación`, 160), body: i.titulo, href: enEvento(i.slug, '/invitados') }
}

export function avisoDeRegalo(i: DelEvento & { invitado: string; regalo: string }): Aviso {
  return { kind: 'regalo', title: recortar(`${i.invitado} reservó «${i.regalo}»`, 160), body: i.titulo, href: enEvento(i.slug, '/regalos') }
}

/** `cuando`: «mañana», «en 7 días»… `ruta`: la pantalla del evento donde se atiende. */
export function avisoDeAgenda(i: DelEvento & { que: string; cuando: string; ruta: string }): Aviso {
  const cuando = i.cuando.charAt(0).toUpperCase() + i.cuando.slice(1)
  return { kind: 'agenda', title: recortar(`${cuando}: ${i.que}`, 160), body: i.titulo, href: enEvento(i.slug, i.ruta) }
}

export function avisoDeVenta(i: { titulo: string; detalle: string; ruta: string }): Aviso {
  return { kind: 'venta', title: recortar(i.titulo, 160), body: recortar(i.detalle, MAX_CUERPO), href: i.ruta }
}

export type CargaPush = { readonly title: string; readonly body: string; readonly url: string; readonly tag: string }

/**
 * Lo que viaja en la notificación push: poco y sin datos de más (el contenido va cifrado, pero pasa
 * por el servicio de push de Google o Apple). La etiqueta junta los del mismo evento y tipo: veinte
 * confirmaciones seguidas no son veinte notificaciones apiladas, es la última.
 */
export function cargaPush(aviso: Aviso, eventId: string | null): CargaPush {
  return { title: aviso.title, body: aviso.body, url: aviso.href, tag: eventId === null ? aviso.kind : `${aviso.kind}:${eventId}` }
}

type Persona = { readonly userId: string; readonly role: string }

/**
 * Quién recibe los avisos de un evento: el atelier dueño, el anfitrión y su planner. **Nunca el
 * admin** —no ve los datos de las bodas, y el aviso lleva nombres de invitados— ni la recepción.
 */
export function destinatariosDelEvento(i: { dueno: Persona | null; equipo: readonly (Persona & { membership: string })[] }): string[] {
  const quienes: string[] = []
  const sumar = (p: Persona) => {
    if (p.role === 'admin' || p.role === 'puerta') return
    if (!quienes.includes(p.userId)) quienes.push(p.userId)
  }
  if (i.dueno) sumar(i.dueno)
  for (const m of i.equipo) if (m.membership === 'cliente' || m.membership === 'planner' || m.membership === 'coanfitrion') sumar(m)
  return quienes
}

/** Si ese tipo va a sus aparatos. La campana lo guarda igual: silenciar es no molestar, no perderlo. */
export const leEnviamosPush = (silenciados: readonly string[], tipo: TipoDeAviso): boolean => !silenciados.includes(tipo)

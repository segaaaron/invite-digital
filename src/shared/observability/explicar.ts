import { traductor, type T } from '@/shared/i18n/t'

/**
 * **Un fallo dicho para personas** (9 de octubre, pedido del usuario: el registro enseñaba el SQL y la pila
 * tal cual). Del servicio, el mensaje y el detalle guardados sale qué pasó en una frase, dónde (la pantalla o
 * el servicio en español) y, si se reconoce la causa, qué significa. Lo técnico no se pierde: la pantalla lo
 * enseña plegado.
 */
export type FalloExplicado = {
  readonly titulo: string
  readonly donde: string
  /** Qué significa y si hay que hacer algo; `null` si la causa no se reconoce. */
  readonly pista: string | null
}

/** Un texto en español e inglés. */
type Par = readonly [string, string]

/** Las tablas con nombre de persona: lo que se leía o se escribía. */
const TABLAS: Readonly<Record<string, Par>> = {
  event_media: ['las fotos y canciones', 'photos and songs'],
  qr_codes: ['los códigos QR', 'QR codes'],
  events: ['los eventos', 'events'],
  guest_groups: ['las invitaciones', 'invitations'],
  guest_people: ['los invitados', 'guests'],
  users: ['las cuentas', 'accounts'],
  sessions: ['las sesiones', 'sessions'],
  orders: ['los pedidos', 'orders'],
  plans: ['los planes', 'plans'],
  rsvp_responses: ['las confirmaciones', 'RSVPs'],
  arrivals: ['los ingresos', 'arrivals'],
  gifts: ['los regalos', 'gifts'],
  consultation_requests: ['las consultas', 'inquiries'],
  app_settings: ['los ajustes', 'settings'],
  avisos: ['los avisos', 'notifications'],
  push_subscriptions: ['los avisos al celular', 'phone notifications'],
  assistant_usage: ['el uso de Luxury', 'Luxury usage'],
}

/** Del módulo o la ruta, la parte del sistema. El primero que casa gana: de lo concreto a lo general. */
const LUGARES: readonly (readonly [RegExp, Par])[] = [
  [/^navegador$/, ['En el navegador', 'In the browser']],
  [/\/media\b/, ['Fotos y música de las invitaciones', 'Invitation photos and music']],
  [/^(route|page|action):\/r\b|^qr\//, ['Códigos QR', 'QR codes']],
  [/\/i\/|^rsvp\//, ['Invitación del invitado', 'Guest invitation']],
  [/\/p\/|porter|^checkin\//, ['Ingreso al evento', 'Event check-in']],
  [/^asistente\/|luxury/i, ['Luxury, el asistente', 'Luxury, the assistant']],
  [/^guests\//, ['Invitados', 'Guests']],
  [/^orders\/|^admin\/ventas|ventas/, ['Ventas y pedidos', 'Sales and orders']],
  [/^admin\/|\/panel\/admin/, ['Administración', 'Administration']],
  [/^identity\/|^sesion$/, ['Cuentas y acceso', 'Accounts and access']],
  [/^events\//, ['Eventos', 'Events']],
  [/^plans\//, ['Planes', 'Plans']],
  [/^registry\//, ['Regalos', 'Gifts']],
  [/^notifications\//, ['Avisos y correos', 'Notifications and email']],
  [/^leads\//, ['Consultas de la web', 'Website inquiries']],
  [/^reminders\//, ['Recordatorios', 'Reminders']],
  [/^analytics\//, ['Estadísticas', 'Statistics']],
  [/^catalog\//, ['Catálogo', 'Catalog']],
  [/^shared\/audio/, ['Música (procesado)', 'Music (processing)']],
  [/^shared\/db/, ['Base de datos', 'Database']],
  [/\/panel/, ['Panel', 'Panel']],
  [/locale|sitemap|^composition\/web|^(route|page):\//, ['Web pública', 'Public website']],
]

/** Causas que se reconocen en el mensaje o el detalle, con lo que significan. */
const CAUSAS: readonly (readonly [RegExp, Par])[] = [
  [/invalid input syntax for type uuid/i, ['Alguien abrió una dirección con un identificador que no existe (un enlace mal copiado o inventado). No hay nada roto.', 'Someone opened an address with an ID that does not exist (a badly copied or made-up link). Nothing is broken.']],
  [/duplicate key/i, ['Se intentó guardar algo que ya existía.', 'Something that already existed was saved again.']],
  [/ECONNREFUSED|Connection terminated|connect ETIMEDOUT|too many clients/i, ['La base de datos no respondió. Si se repite, revisa el servidor en Dokploy.', 'The database did not respond. If it repeats, check the server in Dokploy.']],
  [/ENOSPC/i, ['El disco del servidor está lleno.', 'The server disk is full.']],
  [/RESEND|resend|correo/i, ['El correo no salió. Revisa la clave de Resend o el estado de su servicio.', 'The email was not sent. Check the Resend key or its service status.']],
  [/fetch failed|ENOTFOUND|EAI_AGAIN/i, ['Un servicio externo no respondió.', 'An external service did not respond.']],
  [/micr[oó]fono se cerr[oó] sin o[ií]r/i, ['El micrófono se abrió y no oyó a nadie: suele ser que no se habló o que el permiso tardó en darse.', 'The microphone opened and heard no one: usually nobody spoke or permission took a while.']],
  [/not-allowed|NotAllowedError|permiso/i, ['La persona no dio permiso al micrófono en su navegador.', 'The person did not allow the microphone in their browser.']],
]

/** El mensaje lo escribió el servidor al anotarlo (en español) y se enseña tal cual; lo que se arma aquí va en el idioma de quien mira. */
export function explicarFallo(f: { servicio: string; mensaje: string; detalle: string; ruta: string | null }, t: T = traductor('es')): FalloExplicado {
  // El del navegador dice en qué pantalla pasó; el del servidor, qué servicio (y si no se reconoce, su ruta).
  const dicho = (par: Par | undefined): string | undefined => (par === undefined ? undefined : t(...par))
  const porRuta = f.ruta === null ? undefined : dicho(LUGARES.slice(1).find(([re]) => re.test(f.ruta!))?.[1])
  const donde = f.servicio === 'navegador' ? (porRuta ?? t('En el navegador', 'In the browser')) : (dicho(LUGARES.find(([re]) => re.test(f.servicio))?.[1]) ?? porRuta ?? f.servicio)
  const pista = dicho(CAUSAS.find(([re]) => re.test(f.mensaje) || re.test(f.detalle))?.[1]) ?? null
  return { titulo: tituloDe(f.mensaje, t), donde, pista }
}

function tituloDe(mensaje: string, t: T): string {
  // Lo que escribimos nosotros va delante del error técnico: «No se pudo resolver el código: Error: Failed query…».
  const propio = mensaje.split(/:\s*(?:\w*Error|Failed query)\b/)[0]?.trim() ?? ''
  if (propio !== '' && propio !== mensaje.trim()) return frase(propio)
  const orden = /Failed query:\s*(select|insert|update|delete)\b/i.exec(mensaje)?.[1]?.toLowerCase()
  if (orden !== undefined) {
    const tabla = /\b(?:from|into|update)\s+"(\w+)"/i.exec(mensaje)?.[1]
    const verbo = { select: t('leer', 'read'), insert: t('guardar', 'save'), update: t('actualizar', 'update'), delete: t('borrar', 'delete') }[orden] ?? t('usar', 'use')
    const que = tabla === undefined ? t('en la base de datos', 'in the database') : TABLAS[tabla] === undefined ? t(`la tabla «${tabla}»`, `the “${tabla}” table`) : t(...TABLAS[tabla])
    return t(`No se pudo ${verbo} ${que}`, `Could not ${verbo} ${que}`)
  }
  return frase(mensaje.replace(/^Voz de Luxury:\s*/, t('La voz de Luxury: ', 'Luxury’s voice: ')).slice(0, 160))
}

const frase = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1)

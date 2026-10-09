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

/** Las tablas con nombre de persona: lo que se leía o se escribía. */
const TABLAS: Readonly<Record<string, string>> = {
  event_media: 'las fotos y canciones',
  qr_codes: 'los códigos QR',
  events: 'los eventos',
  guest_groups: 'las invitaciones',
  guest_people: 'los invitados',
  users: 'las cuentas',
  sessions: 'las sesiones',
  orders: 'los pedidos',
  plans: 'los planes',
  rsvp_responses: 'las confirmaciones',
  arrivals: 'los ingresos',
  gifts: 'los regalos',
  consultation_requests: 'las consultas',
  app_settings: 'los ajustes',
  avisos: 'los avisos',
  push_subscriptions: 'los avisos al celular',
  assistant_usage: 'el uso de Luxury',
}

/** Del módulo o la ruta, la parte del sistema. El primero que casa gana: de lo concreto a lo general. */
const LUGARES: readonly (readonly [RegExp, string])[] = [
  [/^navegador$/, 'En el navegador'],
  [/\/media\b/, 'Fotos y música de las invitaciones'],
  [/^(route|page|action):\/r\b|^qr\//, 'Códigos QR'],
  [/\/i\/|^rsvp\//, 'Invitación del invitado'],
  [/\/p\/|porter|^checkin\//, 'Ingreso al evento'],
  [/^asistente\/|luxury/i, 'Luxury, el asistente'],
  [/^guests\//, 'Invitados'],
  [/^orders\/|^admin\/ventas|ventas/, 'Ventas y pedidos'],
  [/^admin\/|\/panel\/admin/, 'Administración'],
  [/^identity\/|^sesion$/, 'Cuentas y acceso'],
  [/^events\//, 'Eventos'],
  [/^plans\//, 'Planes'],
  [/^registry\//, 'Regalos'],
  [/^notifications\//, 'Avisos y correos'],
  [/^leads\//, 'Consultas de la web'],
  [/^reminders\//, 'Recordatorios'],
  [/^analytics\//, 'Estadísticas'],
  [/^catalog\//, 'Catálogo'],
  [/^shared\/audio/, 'Música (procesado)'],
  [/^shared\/db/, 'Base de datos'],
  [/\/panel/, 'Panel'],
  [/locale|sitemap|^composition\/web|^(route|page):\//, 'Web pública'],
]

/** Causas que se reconocen en el mensaje o el detalle, con lo que significan. */
const CAUSAS: readonly (readonly [RegExp, string])[] = [
  [/invalid input syntax for type uuid/i, 'Alguien abrió una dirección con un identificador que no existe (un enlace mal copiado o inventado). No hay nada roto.'],
  [/duplicate key/i, 'Se intentó guardar algo que ya existía.'],
  [/ECONNREFUSED|Connection terminated|connect ETIMEDOUT|too many clients/i, 'La base de datos no respondió. Si se repite, revisa el servidor en Dokploy.'],
  [/ENOSPC/i, 'El disco del servidor está lleno.'],
  [/RESEND|resend|correo/i, 'El correo no salió. Revisa la clave de Resend o el estado de su servicio.'],
  [/fetch failed|ENOTFOUND|EAI_AGAIN/i, 'Un servicio externo no respondió.'],
  [/micr[oó]fono se cerr[oó] sin o[ií]r/i, 'El micrófono se abrió y no oyó a nadie: suele ser que no se habló o que el permiso tardó en darse.'],
  [/not-allowed|NotAllowedError|permiso/i, 'La persona no dio permiso al micrófono en su navegador.'],
]

export function explicarFallo(f: { servicio: string; mensaje: string; detalle: string; ruta: string | null }): FalloExplicado {
  // El del navegador dice en qué pantalla pasó; el del servidor, qué servicio (y si no se reconoce, su ruta).
  const porRuta = f.ruta === null ? undefined : LUGARES.slice(1).find(([re]) => re.test(f.ruta!))?.[1]
  const donde = f.servicio === 'navegador' ? (porRuta ?? 'En el navegador') : (LUGARES.find(([re]) => re.test(f.servicio))?.[1] ?? porRuta ?? f.servicio)
  const pista = CAUSAS.find(([re]) => re.test(f.mensaje) || re.test(f.detalle))?.[1] ?? null
  return { titulo: tituloDe(f.mensaje), donde, pista }
}

function tituloDe(mensaje: string): string {
  // Lo que escribimos nosotros va delante del error técnico: «No se pudo resolver el código: Error: Failed query…».
  const propio = mensaje.split(/:\s*(?:\w*Error|Failed query)\b/)[0]?.trim() ?? ''
  if (propio !== '' && propio !== mensaje.trim()) return frase(propio)
  const orden = /Failed query:\s*(select|insert|update|delete)\b/i.exec(mensaje)?.[1]?.toLowerCase()
  if (orden !== undefined) {
    const tabla = /\b(?:from|into|update)\s+"(\w+)"/i.exec(mensaje)?.[1]
    const verbo = { select: 'leer', insert: 'guardar', update: 'actualizar', delete: 'borrar' }[orden] ?? 'usar'
    return `No se pudo ${verbo} ${tabla === undefined ? 'en la base de datos' : (TABLAS[tabla] ?? `la tabla «${tabla}»`)}`
  }
  return frase(mensaje.replace(/^Voz de Luxury:\s*/, 'La voz de Luxury: ').slice(0, 160))
}

const frase = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1)

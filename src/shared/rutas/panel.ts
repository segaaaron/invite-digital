/**
 * **Las direcciones del panel, en inglés.** (27 oct, pedido del usuario.)
 *
 * Lo que ve el navegador es `/dashboard/login`, `/dashboard/events/<slug>/guests`; las carpetas
 * del código siguen como están (`/panel/entrar`, `/panel/eventos/<slug>/invitados`), igual que ya
 * se hace con la web pública en `i18n/rutas.ts`: el proxy traduce la pública a la interna
 * (`rewrite`) y manda la vieja a la nueva (308), así que los enlaces de los correos ya enviados y
 * los marcadores de cualquiera siguen funcionando.
 *
 * La traducción es **por trozos**: cada segmento se busca en la tabla y lo que no esté se queda
 * igual, que es lo que hace falta para las claves de un evento, los identificadores y los
 * catch-all. El trozo que va justo detrás de `eventos`/`events` nunca se traduce: es la clave del
 * evento, y un evento llamado «plan» no puede convertirse en otra ruta.
 */

/** Interno (español) → público (inglés). Cada palabra una sola vez en cada lado: la vuelta es la misma tabla. */
const SEGMENTOS = {
  panel: 'dashboard',
  entrar: 'login',
  salir: 'logout',
  recuperar: 'recover',
  'nueva-contrasena': 'new-password',
  eventos: 'events',
  nuevo: 'new',
  invitados: 'guests',
  mesas: 'tables',
  checkin: 'check-in',
  configuracion: 'setup',
  ajustes: 'settings',
  equipo: 'team',
  estadisticas: 'stats',
  informe: 'report',
  mensajes: 'messages',
  'dia-d': 'event-day',
  regalos: 'gifts',
  porteros: 'doorkeepers',
  puerta: 'door',
  'vista-previa': 'preview',
  cronograma: 'schedule',
  imprimir: 'print',
  cortejo: 'procession',
  documentos: 'documents',
  presupuesto: 'budget',
  proveedores: 'vendors',
  tareas: 'tasks',
  pedidos: 'orders',
  comprobante: 'receipt',
  cuenta: 'account',
  ayuda: 'help',
  avisos: 'alerts',
  asistente: 'assistant',
  auditoria: 'audit',
  clientes: 'clients',
  consultas: 'inquiries',
  fallos: 'errors',
  ingresos: 'revenue',
  modelos: 'designs',
  pagos: 'payments',
  planes: 'plans',
  usuarios: 'users',
  ventas: 'sales',
  calendario: 'calendar',
  'en-vivo': 'live',
  aparato: 'device',
} as const satisfies Record<string, string>

const A_INGLES = new Map<string, string>(Object.entries(SEGMENTOS))
const A_ESPANOL = new Map<string, string>(Object.entries(SEGMENTOS).map(([es, en]) => [en, es]))

/** Detrás de esto viene la clave de un evento, que no se traduce. */
const ANTES_DE_UNA_CLAVE = new Set(['eventos', 'events'])

/**
 * Lo que va detrás de `eventos` y **sí** se traduce: las dos pantallas fijas que ocupan el sitio de
 * una clave (`/eventos/nuevo`, `/admin/eventos/calendario`). Next ya les da preferencia sobre
 * `[slug]`, así que un evento llamado así tampoco se abriría hoy; dejarlas fuera solo conseguía que
 * el panel enseñara dos direcciones en español.
 */
const FIJAS_TRAS_EVENTOS = new Set(['nuevo', 'new', 'calendario', 'calendar'])

function traducir(ruta: string, tabla: Map<string, string>): string {
  const trozos = ruta.split('/')
  let saltarElSiguiente = false
  const traducidos = trozos.map((trozo) => {
    if (saltarElSiguiente) {
      saltarElSiguiente = false
      if (!FIJAS_TRAS_EVENTOS.has(trozo)) return trozo
    }
    if (ANTES_DE_UNA_CLAVE.has(trozo)) saltarElSiguiente = true
    return tabla.get(trozo) ?? trozo
  })
  return traducidos.join('/')
}

/** `/panel/eventos/boda-ana/invitados` → `/dashboard/events/boda-ana/guests`. Lo que no es del panel, igual. */
export function rutaPublicaDelPanel(interna: string): string {
  return interna === '/panel' || interna.startsWith('/panel/') ? traducir(interna, A_INGLES) : interna
}

/** `/dashboard/events/boda-ana/guests` → `/panel/eventos/boda-ana/invitados`. La que reescribe el proxy. */
export function rutaInternaDelPanel(publica: string): string {
  return publica === '/dashboard' || publica.startsWith('/dashboard/') ? traducir(publica, A_ESPANOL) : publica
}

/** Las direcciones fijas que se escriben a mano en enlaces y redirecciones. */
export const RUTAS = {
  panel: '/dashboard',
  entrar: '/dashboard/login',
  recuperar: '/dashboard/recover',
  nuevaContrasena: '/dashboard/new-password',
  cuenta: '/dashboard/account',
  eventos: '/dashboard/events',
  eventoNuevo: '/dashboard/events/new',
  pedidos: '/dashboard/orders',
  ayuda: '/dashboard/help',
  avisos: '/dashboard/alerts',
  luxury: '/dashboard/luxury',
  planner: '/dashboard/planner',
  admin: '/dashboard/admin',
} as const

/** El camino público de un evento: `evento('boda-ana', '/guests')` → `/dashboard/events/boda-ana/guests`. */
export const evento = (clave: string, resto = ''): string => `${RUTAS.eventos}/${clave}${resto}`

/**
 * The reverse proxy overwrites `x-forwarded-for` and sets `x-real-ip` with the socket
 * address (docker/Caddyfile; under Dokploy, Traefik does the same for untrusted clients),
 * so both are trustworthy in production. If a header
 * ever arrives with a client-supplied chain, the value appended by the closest proxy
 * is the rightmost one — never the leftmost, which anyone can forge.
 */
export function clientIpFrom(headers: { realIp: string | null; forwardedFor: string | null }): string {
  const realIp = headers.realIp?.trim()
  if (realIp !== undefined && realIp.length > 0) return realIp

  const chain = (headers.forwardedFor ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  const ultima = chain[chain.length - 1]
  if (ultima !== undefined) return ultima

  // **Sin cabecera, todos caen en el mismo cubo**, así que los límites por IP pasan a contar el
  // tráfico entero: tres intentos de entrar por minuto para todo el mundo a la vez. Eso no es un
  // detalle, es el sitio caído por una cabecera mal puesta en el proxy, y era invisible. Se avisa
  // una vez cada cinco minutos: con una por petición, el aviso sería el que llena el registro.
  avisarDeIpDesconocida()
  return IP_DESCONOCIDA
}

/** El cubo compartido cuando no hay forma de saber de dónde viene la petición. */
export const IP_DESCONOCIDA = 'desconocida'

let ultimoAviso = 0
function avisarDeIpDesconocida(): void {
  const ahora = Date.now()
  if (ahora - ultimoAviso < 5 * 60_000) return
  ultimoAviso = ahora
  // Importado aquí y no arriba: este fichero lo usan rutas que no quieren el registro cargado.
  void import('@/shared/observability/fallos')
    .then(({ registrarFallo }) =>
      registrarFallo(
        'shared/http/client-ip',
        'no se pudo saber la IP de la petición: ni x-real-ip ni x-forwarded-for',
        'proxy_failure',
        'todos los límites por IP comparten un solo cubo mientras esto pase; revisa las cabeceras del proxy',
      ),
    )
    .catch(() => {})
}

/**
 * La clave de limitador de esta petición: **lo que hay que pasarle a un limitador por IP.**
 *
 * Existe para que no se pueda olvidar el cubo. `clientIpFrom` devuelve la dirección tal cual —que
 * es lo honesto para leerla o guardarla— y el cubo había que acordarse de aplicarlo; donde no se
 * aplicaba, el límite no limitaba nada frente a IPv6 (los comprobantes de pedidos y el registro de
 * fallos del navegador, F2 y F3 del escaneo del 20 oct).
 */
export const cuboDeLaPeticion = (headers: { realIp: string | null; forwardedFor: string | null }): string => cuboDeIp(clientIpFrom(headers))

/**
 * La **clave de limitador** de esa dirección: en IPv6, su /64.
 *
 * Un limitador por dirección completa no limita nada frente a IPv6: a cualquiera le dan una /64
 * entera —18 trillones de direcciones— y rotarlas es gratis, así que «tres por minuto y por IP»
 * se convierte en tres por minuto **y por intento**. El escaneo del 19 oct lo usaba para estimar
 * miles de ciclos por minuto contra el código de recuperación (F7). La /64 es la unidad que se
 * asigna a un cliente, así que es la que hay que contar.
 *
 * En IPv4 la dirección es la clave, tal cual: agrupar por /24 castigaría a oficinas enteras.
 */
export function cuboDeIp(ip: string): string {
  // IPv4 (y cualquier cosa que no parezca IPv6) va tal cual.
  if (!ip.includes(':')) return ip

  // IPv4 mapeada a IPv6 (`::ffff:181.188.1.5`): cuenta como la IPv4 que es.
  const mapeada = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)
  if (mapeada !== null) return mapeada[1]!

  // Las cuatro primeras agrupaciones, expandiendo el `::` que se come las nulas.
  const [izquierda = '', derecha] = ip.split('%')[0]!.split('::')
  const partes = izquierda.split(':').filter((x) => x.length > 0)
  if (derecha !== undefined) {
    const finales = derecha.split(':').filter((x) => x.length > 0)
    const ceros = Math.max(0, 8 - partes.length - finales.length)
    partes.push(...Array.from({ length: ceros }, () => '0'), ...finales)
  }
  // Menos de cuatro agrupaciones: la dirección es más corta que su propia /64, se usa entera.
  const prefijo = partes.slice(0, 4).map((x) => x.replace(/^0+(?=.)/, '').toLowerCase())
  return `${prefijo.join(':')}::/64`
}

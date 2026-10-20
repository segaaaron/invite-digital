/**
 * Si esa dirección es de un **servicio de push de navegador** y no de cualquier otro sitio.
 *
 * El navegador es quien compone el `endpoint` al suscribirse, así que siempre es de su servicio;
 * pero la acción que lo guarda acepta lo que llegue, y aceptaba cualquier `https://`. Con eso,
 * cualquier cuenta del panel podía registrar `https://host-interno:8443/algo` y pedir un aviso de
 * prueba: el servidor hacía el POST y el número de entregados decía si ese host respondió, que es
 * un escáner de puertos internos con nuestra firma (F20 del escaneo del 19 oct).
 *
 * Lista de los servicios de verdad, por sufijo de dominio. Puerto: solo el de https. Sin
 * credenciales en la URL y sin direcciones IP: un servicio de push no se anuncia así.
 *
 * Puro, sin red: se puede probar y vale igual en el guardado y en el envío.
 */
const SERVICIOS: readonly string[] = [
  'fcm.googleapis.com', // Chrome, Edge y Android
  'android.googleapis.com', // Chrome antiguo
  'push.services.mozilla.com', // Firefox
  'web.push.apple.com', // Safari, iPhone y iPad
  'notify.windows.com', // Edge antiguo (`wns2-*.notify.windows.com`)
]

export function esEndpointDePush(endpoint: string): boolean {
  if (endpoint.length > 1000) return false

  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }

  if (url.protocol !== 'https:') return false
  if (url.port !== '') return false
  if (url.username !== '' || url.password !== '') return false

  const host = url.hostname.toLowerCase()
  // Un subdominio del servicio sí (`wns2-par02p.notify.windows.com`); algo que solo lo lleve
  // dentro del nombre, no (`fcm.googleapis.com.ejemplo.bo`).
  return SERVICIOS.some((servicio) => host === servicio || host.endsWith(`.${servicio}`))
}

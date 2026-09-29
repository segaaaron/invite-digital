import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * El Service Worker SOLO sirve recursos. No escribe, no sincroniza en segundo plano y
 * no toca la base: toda escritura pasa por la página, con sesión. Un trabajador que
 * escribiera por su cuenta sería un camino a la base sin `requireSession()`.
 */
const serwist = new Serwist({
  // `exactOptionalPropertyTypes` no admite pasar `undefined` a una propiedad opcional:
  // el manifiesto vacío se representa como lista vacía, no como ausencia.
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

// **Los cambios en vivo (SSE) no pasan por el trabajador**: sin `respondWith`, los maneja el navegador
// y los corta al salir de la página. Pasándolos por aquí (aunque fuera `NetworkOnly`) el trabajador se
// quedaba con cada conexión hasta dormirse (~40 s): con HTTP/1.1, unas cuantas navegaciones llenaban las
// seis conexiones por host y el panel dejaba de cargar. Y `NetworkFirst` los guardaría en caché, un
// stream que no termina. Va antes que Serwist: `stopImmediatePropagation` le quita el evento.
self.addEventListener('fetch', (event) => {
  if (event.request.headers.get('accept')?.includes('text/event-stream')) event.stopImmediatePropagation()
})

// **Las notificaciones push** (28 de septiembre). El servidor manda título, texto, a dónde abrir y una
// etiqueta (`cargaPush`); aquí solo se enseñan. Siempre se enseña algo: un push sin notificación hace que
// Chrome y Safari retiren el permiso (`userVisibleOnly`).
type CargaPush = { title?: string; body?: string; url?: string; tag?: string }

self.addEventListener('push', (event) => {
  let carga: CargaPush = {}
  try {
    carga = (event.data?.json() ?? {}) as CargaPush
  } catch {
    carga = { body: event.data?.text() ?? '' }
  }
  event.waitUntil(
    self.registration.showNotification(carga.title ?? 'Luxury Atelier', {
      body: carga.body ?? '',
      tag: carga.tag,
      // Con la misma etiqueta, la nueva sustituye a la anterior y vuelve a sonar.
      renotify: carga.tag !== undefined,
      icon: '/icons/panel-192.png',
      // El icono pequeño de la barra de Android: blanco sobre transparente.
      badge: '/icons/badge-96.png',
      data: { url: carga.url ?? '/panel' },
    } as NotificationOptions),
  )
})

// Tocar la notificación abre su pantalla: en la pestaña del panel que ya esté abierta, o en una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL(String((event.notification.data as { url?: string } | null)?.url ?? '/panel'), self.location.origin)
  // Solo dentro del sitio: la dirección viene del servidor, pero una notificación no abre nada ajeno.
  if (destino.origin !== self.location.origin) return
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const delPanel = ventanas.find((v) => new URL(v.url).pathname.startsWith('/panel'))
      if (delPanel) {
        await delPanel.focus()
        await delPanel.navigate(destino.href)
        return
      }
      await self.clients.openWindow(destino.href)
    })(),
  )
})

// El navegador renovó la suscripción (lo hace Chrome; los demás, a veces): se guarda la nueva con la
// sesión del panel. Si falla, la próxima visita al panel la vuelve a guardar.
self.addEventListener('pushsubscriptionchange', (event) => {
  const cambio = event as Event & { newSubscription?: PushSubscription | null; waitUntil(p: Promise<unknown>): void }
  const nueva = cambio.newSubscription
  if (!nueva) return
  cambio.waitUntil(
    fetch('/panel/avisos/aparato', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(nueva.toJSON()) }).catch(() => undefined),
  )
})

serwist.addEventListeners()

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

serwist.addEventListeners()

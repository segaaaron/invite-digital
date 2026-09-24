import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { NetworkOnly, Serwist } from 'serwist'

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
  // Los cambios en vivo (SSE) van **directos a la red**, antes que nada. La regla general de
  // `defaultCache` para el mismo origen es `NetworkFirst`, que guarda la respuesta en caché:
  // con un stream que no termina nunca, esa copia se quedaría leyendo y creciendo en memoria.
  runtimeCaching: [{ matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.endsWith('/en-vivo'), handler: new NetworkOnly() }, ...defaultCache],
})

serwist.addEventListeners()

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

serwist.addEventListeners()

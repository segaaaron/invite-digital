import { cache } from 'react'
import { headers } from 'next/headers'
import type { Locale } from './locales'
import { negotiateLocale } from './negotiate'
import { traductor, type T } from './t'

/**
 * El idioma de quien pide la página, para todo lo que no lleva el idioma en la dirección: panel, recepción y
 * proveedor. **Siempre el del aparato** (decidido por el usuario el 14 oct: no hay selector): el que el navegador
 * pide en `Accept-Language`; si no es ni español ni inglés, inglés (`DEFAULT_LOCALE`). Una vez por petición.
 */
export const idiomaDeLaPeticion = cache(async (): Promise<Locale> => {
  try {
    return negotiateLocale({ acceptLanguage: (await headers()).get('accept-language') })
  } catch {
    // Fuera de una petición (pruebas, `pnpm maintenance`) no hay aparato: el de siempre, español.
    return 'es'
  }
})

/** El traductor de la petición, para páginas, acciones y rutas del servidor: `const t = await tr()`. */
export const tr = cache(async (): Promise<T> => traductor(await idiomaDeLaPeticion()))

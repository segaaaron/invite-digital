import { describe, expect, it } from 'vitest'
import { CATALOG_ENTRIES, CATALOG_KEYS, CATALOG_LISTOS } from '@/shared/design/theme-catalog'
import { THEME_KEYS, themeFor } from './registry'

/**
 * El emparejamiento entre lo que el escaparate publica y lo que el motor sabe pintar.
 *
 * Vive aquí y no junto a los datos del catálogo porque el registro de temas es `ui` —
 * arrastra los componentes— y `shared` no puede importarlo: es la frontera que ESLint
 * impone, y la que obligó a mover estos datos a `shared` en primer lugar.
 */
describe('el catálogo y el registro de temas', () => {
  it('todo lo que el escaparate publica tiene un tema que lo pinta', () => {
    // Es lo que impide que una tarjeta lleve a un 404 —o, peor, al tema por defecto con
    // otro nombre—. Marcar un diseño como listo sin registrarlo no lo cantaría nada hasta
    // que un cliente pulsara la tarjeta.
    const sinTema = CATALOG_LISTOS.filter((entrada) => themeFor(entrada.key).key !== entrada.key)
    expect(sinTema.map((entrada) => entrada.key)).toEqual([])
  })

  it('todo tema registrado está en el catálogo y marcado como listo', () => {
    // Y al revés: un diseño portado que nadie publica es trabajo hecho que no se vende, y
    // se olvida exactamente igual de fácil.
    const listos = CATALOG_LISTOS.map((entrada) => entrada.key)
    const sinPublicar = THEME_KEYS.filter((clave) => clave !== 'clasico' && !listos.includes(clave))
    expect(sinPublicar).toEqual([])
  })

  it('los que faltan por portar siguen listados, sin publicar', () => {
    // No es un hueco: es el estado declarado de la colección mientras se termina.
    const pendientes = CATALOG_ENTRIES.filter((entrada) => !entrada.listo).map((entrada) => entrada.key)
    for (const clave of pendientes) {
      expect(CATALOG_KEYS, clave).toContain(clave)
    }
  })
})

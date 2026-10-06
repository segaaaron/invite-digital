import type { ComponentProps } from 'react'
import { MapPreview } from './MapPreview'

/**
 * El plano dentro de la tarjeta de un lugar, como lo pone la maqueta V4 bajo «VER UBICACIÓN»
 * (ceremonia y recepción, una por tarjeta): ocupa el ancho de la tarjeta con un margen corto.
 * Estira la celda aunque la tarjeta sea una rejilla centrada (`justifySelf`).
 */
export function MapaDeLaTarjeta(props: ComponentProps<typeof MapPreview>) {
  return (
    <div style={{ marginTop: 18, width: '100%', justifySelf: 'stretch', boxSizing: 'border-box', padding: '0 8px' }}>
      <MapPreview {...props} />
    </div>
  )
}

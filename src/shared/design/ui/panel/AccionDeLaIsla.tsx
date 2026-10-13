'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** El hueco de la isla del celular donde cada pantalla pone su acción (maqueta M08: el «+» de Invitados). */
export const HUECO_DE_LA_ISLA = 'accion-de-la-isla'

/**
 * **La acción de la pantalla, en la isla del celular** (maqueta «Esmeralda y Latón», M08 · M33): «+» para añadir un
 * invitado, una mesa… Arriba a la derecha, a un toque, en vez de un botón flotante que tapaba la lista y a Luxury.
 * Se monta en el hueco que deja la barra de arriba; en tablet y escritorio la acción está en la cabecera de la página.
 */
export function AccionDeLaIsla({ children }: { children: ReactNode }) {
  // El hueco ya está en la página al hidratar (lo pinta la barra del layout); en el servidor no hay documento.
  const hueco = useSyncExternalStore(
    nadaQueEscuchar,
    () => document.getElementById(HUECO_DE_LA_ISLA),
    () => null,
  )
  return hueco === null ? null : createPortal(children, hueco)
}

const nadaQueEscuchar = () => () => {}

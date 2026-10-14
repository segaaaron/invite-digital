'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** El hueco junto al título de la página, en el celular, donde cada pantalla pone su acción («＋ Añadir»). */
export const HUECO_DE_LA_ISLA = 'accion-de-la-isla'

/**
 * **La acción de la pantalla en el celular** («＋ Añadir» un invitado, una mesa…): junto al título de la página, con su
 * palabra (v2.1, 14 oct; antes iba en la isla de arriba). Se monta en el hueco que deja `PanelHeader`; en tablet y
 * escritorio la acción está en la fila de acciones de la cabecera.
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

'use client'

import { botonClases } from './PanelKit'

/** «Guardar como PDF»: el diálogo de impresión del navegador, que en todos los sistemas guarda un PDF. */
export function BotonImprimir({ children }: { children: React.ReactNode }) {
  return (
    <button className={`${botonClases('primary')} print:hidden`} onClick={() => window.print()} type="button">
      {children}
    </button>
  )
}

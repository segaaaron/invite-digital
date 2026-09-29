'use client'

import { useTransition } from 'react'
import { leaveSupportAction } from '@/app/_acciones/admin/support-actions'

/**
 * Salir del modo soporte. Como entrar, navega el navegador con el destino que devuelve la acción: una
 * petición nueva, ya como admin (con `redirect` la página se pintaba con el actor de antes).
 */
export function RegresarComoAdmin({ className, children }: { className: string; children: string }) {
  const [saliendo, empezar] = useTransition()
  return (
    <button
      aria-busy={saliendo}
      className={className}
      disabled={saliendo}
      onClick={() =>
        empezar(async () => {
          const hecho = await leaveSupportAction()
          if (hecho.status === 'ok') window.location.assign(hecho.href)
        })
      }
      type="button"
    >
      {saliendo ? 'Regresando…' : children}
    </button>
  )
}

'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Una ranura en la vista previa: **la pieza de verdad, y se puede tocar**.
 *
 * Estuvo con `inert`, que la dejaba mirar y nada más: ni escribir el nombre, ni elegir si
 * asistes, ni dejar un mensaje. La maqueta no hace eso —sus formularios se rellenan— y en
 * la pantalla donde el cliente decide qué modelo compra, un formulario que no responde al
 * teclado parece un formulario roto.
 *
 * Lo único que se bloquea es el **envío**. Un `preventDefault` en la fase de captura, sobre
 * el `submit`, antes de que el evento llegue a la ranura: React descarta su propio
 * manejador de acción cuando el evento ya viene con el defecto impedido, así que la Server
 * Action no llega a dispararse. Y hace falta que no se dispare: aquí el token está vacío,
 * no hay grupo de invitados detrás y una confirmación de mentira acabaría en el panel de
 * alguien.
 *
 * Escribir sí, guardar no. Que es lo que hace la maqueta.
 */
export function PreviewSlot({ children }: { readonly children: ReactNode }) {
  const nodo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const caja = nodo.current
    if (caja === null) return

    const bloquear = (evento: Event) => {
      evento.preventDefault()
    }

    // En captura: el evento pasa por aquí **antes** que por el formulario, así que cuando
    // React lo recoge para ejecutar la acción ya está marcado y se lo salta.
    caja.addEventListener('submit', bloquear, true)
    return () => caja.removeEventListener('submit', bloquear, true)
  }, [])

  return <div ref={nodo}>{children}</div>
}

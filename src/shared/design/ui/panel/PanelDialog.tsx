'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * El envoltorio de los modales de la maqueta: título arriba y el formulario dentro.
 *
 * Es un `<dialog>` nativo abierto con `showModal()`, que es lo único que atrapa el foco
 * dentro, cierra con Escape y deja el fondo inerte de verdad. Una capa hecha con `div`s
 * deja la página de detrás navegable con el tabulador.
 *
 * Se abre porque lo dice la dirección y se cierra volviendo a ella: cada guardado revalida
 * el árbol y remonta el componente, lo que perdería un `useState`.
 */
export function PanelDialog({
  title,
  closeHref,
  children,
  width = 480,
}: {
  title: string
  closeHref: string
  children: ReactNode
  width?: number
}) {
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const nodo = dialogo.current
    if (nodo !== null && !nodo.open) nodo.showModal()
  }, [])

  const cerrar = () => {
    dialogo.current?.close()
    // `replace`, no `push`: con `push`, volver atrás reabre el diálogo.
    router.replace(closeHref)
  }

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={id}
      className="m-auto rounded-[18px] border border-line-panel bg-bg-raised p-7 text-ink shadow-float backdrop:bg-ink/45"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
      style={{ width: `min(${width}px, 94vw)` }}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-[24px] font-light italic" id={id}>
          {title}
        </h2>
        <button
          aria-label="Cerrar"
          className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-line-panel bg-white text-[13px]"
          onClick={cerrar}
          type="button"
        >
          <span aria-hidden>✕</span>
        </button>
      </div>

      <div className="mt-5">{children}</div>
    </dialog>
  )
}

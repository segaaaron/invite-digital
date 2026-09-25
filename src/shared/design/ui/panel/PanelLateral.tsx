'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * El detalle de algo **sin salir de su lista**: un panel que entra por la derecha, como en
 * Linear, Stripe o HoneyBook. La lista sigue detrás y al cerrar se vuelve a ella tal cual.
 *
 * Como `PanelDialog`: `<dialog>` nativo con `showModal()` —foco atrapado, Escape cierra, fondo
 * inerte— que se abre porque lo dice la dirección (`?evento=…`, `?pedido=…`) y se cierra volviendo
 * a ella: así se enlaza, sobrevive a recargar y no lo borra el remontaje de una acción.
 * En el celular ocupa la pantalla entera.
 */
export function PanelLateral({
  title,
  subtitle,
  closeHref,
  acciones,
  children,
}: {
  title: string
  subtitle?: string | undefined
  closeHref: string
  /** Botones de la cabecera: lo que se hace con esto sin abrir otra pantalla. */
  acciones?: ReactNode
  children: ReactNode
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
    // `replace`: volver atrás no reabre el panel.
    router.replace(closeHref, { scroll: false })
  }

  return (
    <dialog
      aria-labelledby={id}
      className="panel-lateral fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none border-l border-line-panel bg-bg-raised p-0 text-ink shadow-float backdrop:bg-ink/35 min-[640px]:w-[min(580px,100vw)]"
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
      onClick={(e) => {
        // Pulsar fuera (en el velo) cierra, como en cualquier panel lateral.
        if (e.target === dialogo.current) cerrar()
      }}
      ref={dialogo}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line-panel px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate font-display text-[26px] leading-tight font-light" id={id}>
              {title}
            </h2>
            {subtitle === undefined ? null : <p className="mt-1 text-[13px] text-ink-soft">{subtitle}</p>}
          </div>
          <button
            aria-label="Cerrar"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-panel bg-white text-[13px] transition-colors hover:border-ink"
            onClick={cerrar}
            type="button"
          >
            <span aria-hidden>✕</span>
          </button>
        </header>
        {acciones === undefined ? null : <div className="flex flex-wrap gap-2 border-b border-line-panel px-6 py-3.5">{acciones}</div>}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </dialog>
  )
}

/** Un dato del panel: rótulo arriba, valor debajo. */
export function DatoLateral({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-medium tracking-[0.1em] text-ink-mute uppercase">{label}</dt>
      <dd className="text-[14px] text-ink">{children}</dd>
    </div>
  )
}

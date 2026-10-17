'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { ArrowLeftIcon, CloseIcon } from '../icons'
import { useT } from '@/shared/i18n/idioma-navegador'

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
  ancho = 'normal',
  children,
}: {
  /** `amplio` para un formulario de varias columnas (el alta de un evento). */
  ancho?: 'normal' | 'amplio'
  title: string
  subtitle?: string | undefined
  closeHref: string
  /** Botones de la cabecera: lo que se hace con esto sin abrir otra pantalla. */
  acciones?: ReactNode
  children: ReactNode
}) {
  const t = useT()
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
      className={`panel-lateral fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none border-l border-line-panel bg-bg p-0 text-ink shadow-float backdrop:bg-shell-deep/50 ${ancho === 'amplio' ? 'min-[640px]:w-[min(1000px,100vw)]' : 'min-[640px]:w-[min(580px,100vw)]'}`}
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
        {/* En el celular, la barra «← Volver / Título» de la maqueta (M49), en vez del ✕. */}
        <button
          className="mx-4 mt-2.5 flex min-h-15 cursor-pointer items-center gap-2 rounded-[18px] border border-line-panel bg-bg-raised px-1.5 text-left shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] min-[640px]:hidden"
          onClick={cerrar}
          type="button"
        >
          <span aria-hidden className="grid size-11 shrink-0 place-items-center">
            <ArrowLeftIcon className="size-5" />
          </span>
          <span className="truncate text-[16px] font-medium">{title}</span>
          <span className="sr-only">{t(': cerrar', ': close')}</span>
        </button>
        <header className="flex items-start justify-between gap-4 px-7 pt-7 pb-3 max-[639px]:px-4 max-[639px]:pt-5">
          <div className="min-w-0">
            <h2 className="font-display text-[30px] leading-tight font-medium" id={id}>
              {title}
            </h2>
            {subtitle === undefined ? null : <p className="mt-1 text-[15px] text-ink-mute">{subtitle}</p>}
          </div>
          <button
            aria-label={t('Cerrar', 'Close')}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised transition-colors hover:border-gold max-[639px]:hidden"
            onClick={cerrar}
            type="button"
          >
            <CloseIcon className="size-4" />
          </button>
        </header>
        {acciones === undefined ? null : <div className="flex flex-wrap gap-2 border-b border-line-panel px-7 pb-4 max-[639px]:px-5">{acciones}</div>}
        <div className="flex-1 overflow-y-auto px-7 py-5 max-[639px]:px-5">{children}</div>
      </div>
    </dialog>
  )
}

/** Un dato del panel: rótulo arriba, valor debajo. */
export function DatoLateral({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[12px] font-medium tracking-[0.1em] text-ink-mute uppercase">{label}</dt>
      <dd className="text-[14px] text-ink">{children}</dd>
    </div>
  )
}

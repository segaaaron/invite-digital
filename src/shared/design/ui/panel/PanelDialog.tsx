'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { ArrowLeftIcon, CloseIcon } from '../icons'
import { useT } from '@/shared/i18n/idioma-navegador'

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
  descripcion,
  lado = 'centro',
  kicker,
}: {
  title: string
  closeHref: string
  children: ReactNode
  width?: number
  /** La línea bajo el título: «Se descuenta de lo que falta pagar.» */
  descripcion?: string
  /** `derecha`: un panel que entra por la derecha (E57, E60), para las altas largas. */
  lado?: 'centro' | 'derecha'
  /** La línea pequeña sobre el título del panel lateral: de qué sección es («Regalos»). */
  kicker?: string
}) {
  const t = useT()
  const router = useRouter()
  const dialogo = useRef<HTMLDialogElement>(null)
  const id = useId()

  useEffect(() => {
    const nodo = dialogo.current
    if (nodo !== null && !nodo.open) {
      nodo.showModal()
      // El foco al primer campo, no a la ✕: se viene a escribir.
      nodo.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')?.focus()
    }
  }, [])

  const cerrar = () => {
    dialogo.current?.close()
    // `replace`, no `push`: con `push`, volver atrás reabre el diálogo.
    router.replace(closeHref)
  }

  return (
    // La piel de la maqueta (E61, M58): marfil, título grande, cerrar en un cuadrado. En el celular, una hoja que sube
    // desde abajo con su asa.
    <dialog
      ref={dialogo}
      aria-labelledby={id}
      // En el celular, una pantalla entera con su barra «← Sección / Título» (maqueta M50, M54, M56…): sin velo ni hoja.
      className={`max-w-none overflow-y-auto border border-line-panel bg-bg p-7 text-ink shadow-float backdrop:bg-shell-deep/50 max-[767px]:fixed max-[767px]:inset-0 max-[767px]:m-0 max-[767px]:h-dvh max-[767px]:max-h-dvh max-[767px]:w-full max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:px-4 max-[767px]:pt-2.5 max-[767px]:pb-[max(24px,env(safe-area-inset-bottom))] ${
        lado === 'derecha'
          ? 'min-[768px]:fixed min-[768px]:inset-y-0 min-[768px]:right-0 min-[768px]:left-auto min-[768px]:m-0 min-[768px]:h-dvh min-[768px]:max-h-dvh min-[768px]:w-[min(var(--ancho),100vw)] min-[768px]:border-y-0 min-[768px]:border-r-0'
          : 'm-auto max-h-[92dvh] w-[min(var(--ancho),94vw)] rounded-[20px]'
      }`}
      onCancel={(e) => {
        e.preventDefault()
        cerrar()
      }}
      style={{ ['--ancho' as string]: `${width}px` }}
    >
      <button
        className="mb-5 flex min-h-15 w-full cursor-pointer items-center gap-2 rounded-[18px] border border-line-panel bg-bg-raised px-1.5 text-left shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] min-[768px]:hidden"
        onClick={cerrar}
        type="button"
      >
        <span aria-hidden className="grid size-11 shrink-0 place-items-center">
          <ArrowLeftIcon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          {kicker ? <span className="text-[13px] text-ink-mute">{kicker}</span> : null}
          <span className="truncate text-[16px] font-medium">{title}</span>
        </span>
        <span className="sr-only">{t(': cerrar', ': close')}</span>
      </button>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          {kicker ? <p className="text-[14px] text-ink-mute max-[767px]:hidden">{kicker}</p> : null}
          <h2 className="font-display text-[30px] leading-tight font-medium max-[767px]:text-[26px]" id={id}>
            {title}
          </h2>
          {descripcion ? <p className="text-[15px] text-ink-mute">{descripcion}</p> : null}
        </div>
        <button
          aria-label={t('Cerrar', 'Close')}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised text-ink transition-colors hover:border-gold max-[767px]:hidden"
          onClick={cerrar}
          type="button"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      <div className="mt-5">{children}</div>
    </dialog>
  )
}

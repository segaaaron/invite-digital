'use client'

import { useId, useRef, type ReactNode } from 'react'

/**
 * Una acción que se confirma antes de hacerse: el botón abre un `<dialog>` nativo (foco
 * atrapado, Escape cierra, fondo inerte) y el formulario de verdad vive dentro.
 *
 * Sigue a NN/g: el diálogo **dice qué va a pasar**, no «¿Estás seguro?», y el botón de
 * confirmar repite el verbo («Cerrar sesión», «Borrar usuario»). Un «Sí» genérico se pulsa
 * sin leer y no protege de nada.
 */
export function ConfirmAction({
  trigger,
  triggerClassName,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'default',
  action,
  children,
  disabled = false,
  describedBy,
}: {
  /** Lo que dice el botón que abre el diálogo. */
  trigger: ReactNode
  triggerClassName: string
  title: string
  description: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  action: (formData: FormData) => void | Promise<void>
  /** Los campos ocultos que necesita la acción. */
  children?: ReactNode
  disabled?: boolean
  describedBy?: string | undefined
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const id = useId()

  return (
    <>
      <button
        aria-describedby={describedBy}
        aria-haspopup="dialog"
        className={triggerClassName}
        disabled={disabled}
        onClick={() => dialogo.current?.showModal()}
        type="button"
      >
        {trigger}
      </button>
      <dialog
        aria-describedby={`${id}-desc`}
        aria-labelledby={`${id}-titulo`}
        className="m-auto w-[min(440px,92vw)] rounded-[18px] border border-line-panel bg-bg-raised p-6 text-left text-ink shadow-float backdrop:bg-ink/45"
        ref={dialogo}
      >
        <h2 className="font-display text-[22px] leading-tight" id={`${id}-titulo`}>
          {title}
        </h2>
        <div className="mt-2 text-[13.5px] leading-[1.6] text-ink-soft" id={`${id}-desc`}>
          {description}
        </div>
        <form action={action} className="mt-6 flex flex-wrap justify-end gap-2" onSubmit={() => dialogo.current?.close()}>
          {children}
          <button
            className="rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-5 py-2.5 text-[13px] text-ink transition-colors hover:border-ink"
            onClick={() => dialogo.current?.close()}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            autoFocus={tone !== 'danger'}
            className={`rounded-[var(--radius-pill)] px-5 py-2.5 text-[13px] text-white transition-colors ${
              tone === 'danger' ? 'bg-danger hover:bg-danger-deep' : 'bg-ink hover:bg-ink-soft'
            }`}
            type="submit"
          >
            {confirmLabel}
          </button>
        </form>
      </dialog>
    </>
  )
}

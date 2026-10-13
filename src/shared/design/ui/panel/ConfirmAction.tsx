'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import { CloseIcon, ArrowLeftIcon } from '../icons'
import { botonClases, FIELD_CLASS, LABEL_CLASS } from './PanelKit'

/**
 * Una acción que se confirma antes de hacerse: el botón abre un `<dialog>` nativo (foco
 * atrapado, Escape cierra, fondo inerte) y el formulario de verdad vive dentro.
 *
 * Sigue a NN/g: el diálogo **dice qué va a pasar**, no «¿Estás seguro?», y el botón de
 * confirmar repite el verbo («Cerrar sesión», «Borrar para siempre»). Un «Sí» genérico se pulsa
 * sin leer y no protege de nada.
 *
 * La piel es la de la maqueta (E65, E66): título grande, ✕ en su cuadro, «Cancelar» blanco y el verbo a la
 * derecha, en esmeralda o, si no se deshace, en rojo macizo. En el celular, una hoja que sube desde abajo.
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
  aviso,
  requiere,
  requiereEtiqueta = 'Para confirmar, escríbelo',
  cuerpo,
  volver,
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
  /** Lo que se pierde, en la caja roja (E65). */
  aviso?: ReactNode
  /** Un texto que hay que escribir para poder confirmar (el nombre del evento). Viaja como `confirmation`. */
  requiere?: string
  requiereEtiqueta?: string
  /** Contenido de más bajo la descripción: la lista de lo que pasa (E66). */
  cuerpo?: ReactNode
  /** En el celular, de dónde se viene, sobre el título de la barra («Ficha del evento», M62). */
  volver?: string
}) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const id = useId()
  const [escrito, setEscrito] = useState('')
  const listo = requiere === undefined || escrito.trim().toLocaleLowerCase('es') === requiere.trim().toLocaleLowerCase('es')
  const cerrar = () => dialogo.current?.close()

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
        className="m-auto max-h-[92dvh] w-[min(560px,94vw)] max-w-none overflow-y-auto rounded-[20px] border border-line-panel bg-bg p-7 text-left text-ink shadow-float backdrop:bg-shell-deep/50 max-[767px]:fixed max-[767px]:inset-0 max-[767px]:m-0 max-[767px]:h-dvh max-[767px]:max-h-dvh max-[767px]:w-full max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:px-4 max-[767px]:pt-2.5 max-[767px]:pb-[max(24px,env(safe-area-inset-bottom))]"
        onClose={() => setEscrito('')}
        ref={dialogo}
      >
        <button className="mb-5 flex min-h-15 w-full cursor-pointer items-center gap-2 rounded-[18px] border border-line-panel bg-bg-raised px-1.5 text-left shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] min-[768px]:hidden" onClick={cerrar} type="button">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center">
            <ArrowLeftIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            {volver === undefined ? null : <span className="text-[13px] text-ink-mute">{volver}</span>}
            <span className="truncate text-[16px] font-medium">{title}</span>
          </span>
          <span className="sr-only">: cerrar</span>
        </button>
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-[30px] leading-tight font-medium max-[767px]:text-[26px]" id={`${id}-titulo`}>
            {title}
          </h2>
          <button
            aria-label="Cerrar"
            className="max-[767px]:hidden grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised text-ink transition-colors hover:border-gold"
            onClick={cerrar}
            type="button"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
        <div className="mt-2 text-[15px] leading-[1.6] text-ink-mute" id={`${id}-desc`}>
          {description}
        </div>
        {cuerpo === undefined ? null : <div className="mt-4 text-[15px] leading-[1.7] text-ink">{cuerpo}</div>}
        {aviso === undefined ? null : <div className="mt-5 rounded-[12px] bg-danger/12 px-4 py-3.5 text-[15px] leading-[1.6] text-danger-deep">{aviso}</div>}
        <form action={action} className="mt-6 flex flex-col gap-5" onSubmit={() => cerrar()}>
          {children}
          {requiere === undefined ? null : (
            <label className="flex flex-col gap-2" htmlFor={`${id}-requiere`}>
              <span className={LABEL_CLASS}>{requiereEtiqueta}</span>
              <input
                autoComplete="off"
                className={FIELD_CLASS}
                id={`${id}-requiere`}
                name="confirmation"
                onChange={(e) => setEscrito(e.target.value)}
                placeholder={requiere}
                value={escrito}
              />
            </label>
          )}
          <div className="flex flex-wrap justify-end gap-2.5 max-[767px]:flex-col-reverse max-[767px]:items-stretch">
            <button className={botonClases('default')} onClick={cerrar} type="button">
              {cancelLabel}
            </button>
            <button autoFocus={tone !== 'danger' && requiere === undefined} className={botonClases(tone === 'danger' ? 'peligro' : 'primary')} disabled={!listo} type="submit">
              {confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}

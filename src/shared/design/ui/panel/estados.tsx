import type { ReactNode } from 'react'
import { PanelAlert, PanelButton } from './PanelKit'

export { SubmitButton, type SubmitButtonProps } from './SubmitButton'

/** El estado que devuelven las Server Actions del panel por `useActionState`. */
export type ActionState = { readonly status: 'idle' } | { readonly status: 'success'; readonly message?: string | undefined } | { readonly status: 'error'; readonly message: string }

/**
 * El resultado de una acción, pegado a su formulario. Repetido a mano en 24 sitios como
 * `estado.status === 'error' ? <PanelAlert tone="error">…</PanelAlert> : null`.
 *
 * - En reposo, o con un éxito sin mensaje, no pinta nada: un hueco vacío no se anuncia.
 * - El error va con `role="alert"` (interrumpe) y el acierto con `role="status"` (no), por
 *   `PanelAlert`.
 */
export function ActionFeedback({
  state,
  errorsOnly = false,
}: {
  state: { readonly status: string; readonly message?: string | undefined }
  /** Solo el error: para la pantalla que ya dice el acierto de otra forma (la fila se va, un texto fijo). */
  errorsOnly?: boolean
}) {
  if (state.status === 'error' && state.message) return <PanelAlert tone="error">{state.message}</PanelAlert>
  if (!errorsOnly && state.status === 'success' && state.message) return <PanelAlert tone="ok">{state.message}</PanelAlert>
  return null
}

/**
 * Lo que se enseña cuando una lista no tiene nada. Dice **qué** falta y, si la hay, la salida:
 * una tabla vacía sin explicación parece un fallo de carga.
 */
export function EmptyState({ title, description, action }: { title: string; description?: string | undefined; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <p className="text-[14px] text-ink">{title}</p>
      {description ? <p className="max-w-[46ch] text-[13px] leading-[1.6] text-ink-mute">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

/**
 * «Ver más» de una lista paginada por la dirección (`?n=`). Su nombre accesible dice qué y
 * cuántos —«Ver 5 pedidos más»—, porque un «Ver más» suelto no dice a qué lista pertenece. Sin
 * nada que cargar no se pinta.
 */
export function LoadMoreLink({ href, noun, remaining }: { href: string; noun: string; remaining?: number | undefined }) {
  if (remaining !== undefined && remaining <= 0) return null
  const nombre = remaining === undefined ? `Ver más ${noun}` : `Ver ${remaining} ${noun} más`
  return (
    <p className="pt-1 text-center">
      <PanelButton aria-label={nombre} href={href}>
        {remaining === undefined ? 'Ver más' : `Ver más (${remaining})`}
      </PanelButton>
    </p>
  )
}

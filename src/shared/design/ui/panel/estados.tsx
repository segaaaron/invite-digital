import type { ReactNode } from 'react'
import { PanelAlert, PanelButton } from './PanelKit'
import { T } from '@/shared/i18n/idioma-navegador'

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
export function EmptyState({
  title,
  description,
  action,
  icon,
  compact = false,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  /** Un icono SVG de `icons.tsx`, dentro de su medallón. */
  icon?: ReactNode
  /** Dentro de una tarjeta pequeña: menos aire. */
  compact?: boolean
}) {
  return (
    <div
      // La maqueta (E40): marfil sobre borde de puntos latón, medallón con su aro, título en Bodoni y la salida.
      className={`relative flex flex-col items-center gap-3 overflow-hidden rounded-[18px] border border-dashed border-gold/45 bg-bg-raised text-center ${
        compact ? 'px-5 py-7' : 'px-6 py-12 min-[560px]:py-14'
      }`}
    >
      {icon === undefined ? null : (
        <span
          aria-hidden
          className={`relative grid place-items-center rounded-full bg-pill-pending text-gold-deep ring-1 ring-gold/35 [&>svg]:size-[42%] ${compact ? 'size-12' : 'size-[84px]'}`}
        >
          <span className="absolute inset-[-8px] rounded-full bg-pill-pending/50" />
          {icon}
        </span>
      )}
      <p className={`m-0 font-display font-medium text-ink ${compact ? 'text-[22px]' : 'mt-2 text-[34px] max-[559px]:text-[28px]'} leading-tight`}>{title}</p>
      {description ? <p className="m-0 max-w-[48ch] text-[15px] leading-[1.65] text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2.5">{action}</div> : null}
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
  return (
    <p className="pt-1 text-center">
      {/* El nombre accesible dice qué y cuántos («Ver 5 pedidos más»); lo visible, corto. */}
      <PanelButton href={href}>
        <span aria-hidden>{remaining === undefined ? <T en="See more" es="Ver más" /> : <T en={`See more (${remaining})`} es={`Ver más (${remaining})`} />}</span>
        <span className="sr-only">{remaining === undefined ? <T en={`See more ${noun}`} es={`Ver más ${noun}`} /> : <T en={`See ${remaining} more ${noun}`} es={`Ver ${remaining} ${noun} más`} />}</span>
      </PanelButton>
    </p>
  )
}

/**
 * La explicación larga de una pantalla, plegada. Lo que se lee una vez —cómo funciona, por
 * qué— no puede ocupar el sitio de lo que se usa cada día. `<details>` nativo: abre con
 * teclado y sin JavaScript.
 */
export function Ayuda({ children, titulo }: { children: ReactNode; titulo?: string }) {
  return (
    <details className="group text-[12px] leading-[1.7] text-ink-soft">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-mono max-[859px]:min-h-11 text-[12px] tracking-[0.2em] text-ink-mute uppercase hover:text-ink [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="grid size-4 place-items-center rounded-full border border-current text-[10.5px] leading-none">
          ?
        </span>
        {titulo ?? <T en="How does it work?" es="¿Cómo funciona?" />}
      </summary>
      <div className="mt-2.5 flex max-w-[70ch] flex-col gap-2">{children}</div>
    </details>
  )
}

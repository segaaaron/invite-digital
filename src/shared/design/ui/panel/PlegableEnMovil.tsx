import type { ReactNode } from 'react'
import { ChevronIcon } from '@/shared/design/ui/icons'

/**
 * **Lo que en el celular va plegado y en tableta o escritorio abierto, sin parpadeo** (6 de octubre).
 *
 * El inicio del evento apilaba trece bloques en el teléfono —4.279 px— y lo del día a día quedaba
 * enterrado bajo gráficos. Lo que se mira de vez en cuando (estadísticas, invitados recientes, mesas)
 * va aquí: una fila que se toca para abrir. Lo decide **el servidor** por el agente del aparato
 * (`classifyDevice`, el mismo que usan las invitaciones): así sale bien desde el primer pintado, sin
 * abrir y cerrar al hidratar. Fuera del celular no envuelve nada: el contenido sale tal cual.
 */
export function PlegableEnMovil({
  celular,
  titulo,
  resumen,
  children,
}: {
  /** Si quien mira usa un teléfono. */
  celular: boolean
  titulo: string
  /** Una línea de lo que hay dentro, para decidir si abrirlo: «88 % respondió · 6 mensajes». */
  resumen?: string
  children: ReactNode
}) {
  if (!celular) return <>{children}</>
  return (
    <details className="group/plegable mb-4.5 rounded-[18px] border border-line-panel bg-linear-to-b from-bg-top to-white shadow-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4.5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[20px] leading-tight text-ink italic">{titulo}</span>
          {resumen === undefined ? null : <span className="mt-0.5 block truncate text-[13px] text-ink-soft">{resumen}</span>}
        </span>
        <ChevronIcon className="size-5 shrink-0 text-ink-mute transition-transform group-open/plegable:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4.5 px-2.5 pb-3">{children}</div>
    </details>
  )
}

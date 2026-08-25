import type { SeatedGroupRow } from '../application/ports'

/**
 * La tira desaparece sola cuando no queda nadie. Una tira vacía con un «0 pendientes»
 * es ruido permanente en una pantalla que el atelier mira muchas veces.
 */
export function UnseatedStrip({ groups }: { groups: readonly SeatedGroupRow[] }) {
  if (groups.length === 0) return null

  return (
    <section
      aria-label="Invitados sin mesa"
      className="flex flex-col gap-3"
    >
      <ul className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <li
            key={group.id}
            className="flex items-baseline gap-2 rounded-pill border border-line-panel bg-white px-3 py-1.5 text-[13px] text-ink-soft"
          >
            <span>{group.label}</span>
            <span className="font-mono text-[10px] text-ink-mute">
              {group.seats} cupo{group.seats === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

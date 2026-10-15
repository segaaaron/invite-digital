'use client'

import type { SeatedGroupRow } from '../application/ports'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * La tira desaparece sola cuando no queda nadie. Una tira vacía con un «0 pendientes»
 * es ruido permanente en una pantalla que el atelier mira muchas veces.
 */
export function UnseatedStrip({ groups }: { groups: readonly SeatedGroupRow[] }) {
  const t = useT()
  if (groups.length === 0) return null

  return (
    <section
      aria-label={t('Invitados sin mesa', 'Unseated guests')}
      className="flex flex-col gap-3"
    >
      <ul className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <li
            key={group.id}
            className="flex items-baseline gap-2 rounded-full border border-line-panel bg-tarjeta px-3.5 py-1.5 text-[14px]"
          >
            <span>{group.label}</span>
            <span className="text-[12.5px] text-ink-mute">
              {group.seats} {group.seats === 1 ? t('persona', 'person') : t('personas', 'people')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

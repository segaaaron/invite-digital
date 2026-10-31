'use client'

import type { SeatedGroupRow } from '../application/ports'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * La tira desaparece sola cuando no queda nadie. Una tira vacía con un «0 pendientes»
 * es ruido permanente en una pantalla que el atelier mira muchas veces.
 *
 * **Con su rótulo a la vista.** Solo lo decía el `aria-label`, así que quien mira la pantalla veía una fila de
 * píldoras con nombres sueltos encima del salón, sin nada que dijera qué son (30 oct).
 */
export function UnseatedStrip({ groups }: { groups: readonly SeatedGroupRow[] }) {
  const t = useT()
  if (groups.length === 0) return null
  const personas = groups.reduce((n, g) => n + g.seats, 0)

  return (
    <section
      aria-label={t('Invitados sin mesa', 'Unseated guests')}
      className="flex flex-col gap-3"
    >
      <h2 className="text-[13px] font-medium tracking-[0.02em] text-ink-mute">
        {t(`Sin mesa · ${personas} ${personas === 1 ? 'persona' : 'personas'}`, `No table yet · ${personas} ${personas === 1 ? 'person' : 'people'}`)}
      </h2>
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

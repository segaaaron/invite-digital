export type ActivityItem = {
  readonly at: Date
  /** Quién lo hizo. Da la inicial del avatar y la primera línea. */
  readonly actor: string
  /** Qué hizo, en minúscula y sin repetir el nombre. */
  readonly action: string
}

const MAXIMO = 10

/**
 * La actividad reciente de la maqueta, compuesta de lo que **ya se registra**: mensajes
 * del libro de firmas, llegadas de la puerta y regalos reservados.
 *
 * No hay tabla de actividad, y no hace falta: cada hecho ya tiene su fila con su fecha en
 * el módulo al que pertenece. Duplicarlos en un registro aparte crearía dos versiones de
 * la misma verdad que se desincronizan en cuanto una se edite.
 */
export function mergeActivity(...fuentes: readonly (readonly ActivityItem[])[]): ActivityItem[] {
  return fuentes
    .flat()
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, MAXIMO)
}

export function ActivityFeed({ items }: { items: readonly ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-[13px] text-ink-mute">Todavía no ha pasado nada. Aquí saldrá lo que hagan los invitados.</p>
  }

  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li
          key={`${item.at.toISOString()}-${item.actor}-${item.action}`}
          className="flex gap-3 border-b border-line-panel py-3 last:border-none"
        >
          {/* El avatar es decorativo: el nombre va escrito al lado, en texto. */}
          <span
            aria-hidden
            data-avatar
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sage to-[var(--color-gold-light)] font-display text-[16px] italic text-white"
          >
            {item.actor.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">{item.actor}</span>
            <span className="block text-[12px] text-ink-soft">{item.action}</span>
          </span>
          <span className="font-mono text-[9px] tracking-[0.2em] whitespace-nowrap text-ink-mute uppercase">
            {item.at.toLocaleDateString('es-BO', { day: 'numeric', month: 'long' })}
          </span>
        </li>
      ))}
    </ul>
  )
}

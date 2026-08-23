export type ActivityItem = {
  readonly at: Date
  readonly icon: string
  readonly text: string
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
          key={`${item.at.toISOString()}-${item.text}`}
          className="flex items-baseline gap-3 border-b border-dotted border-line py-2.5 last:border-none"
        >
          <span aria-hidden className="text-[13px]">
            {item.icon}
          </span>
          <span className="flex-1 text-[13.5px] text-ink">{item.text}</span>
          <span className="font-mono text-[10px] whitespace-nowrap text-ink-mute">
            {item.at.toLocaleDateString('es-BO', { day: 'numeric', month: 'long' })}
          </span>
        </li>
      ))}
    </ul>
  )
}

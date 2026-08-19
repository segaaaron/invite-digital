import Link from 'next/link'
import type { Event } from '../domain/event'

const STATUS_LABEL = { draft: 'Borrador', live: 'En marcha', closed: 'Cerrado' } as const

export function EventList({ events }: { events: readonly Event[] }) {
  if (events.length === 0) {
    return <p className="text-[14px] text-ink-soft">Todavía no hay eventos. Crea el primero.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            className="flex items-center justify-between gap-4 rounded-[14px] border border-[var(--color-line)] px-5 py-4 transition-colors hover:border-gold"
            href={`/panel/eventos/${event.slug}`}
          >
            <span className="font-display text-[18px] font-light text-ink">{event.title}</span>
            <span className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">
              {`${event.eventDate} · ${STATUS_LABEL[event.status]}`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

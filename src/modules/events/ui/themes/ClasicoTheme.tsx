import type { ThemeProps } from './registry'

const LOCALE_TAG = { es: 'es-BO', en: 'en-US' } as const

export function ClasicoTheme({ event, children }: ThemeProps) {
  // Mediodía UTC y `timeZone: 'UTC'`: la fecha del evento es un día del calendario, no
  // un instante, y sin fijar la zona un huso al oeste la mostraría un día antes.
  const fecha = new Date(`${event.eventDate}T12:00:00Z`).toLocaleDateString(LOCALE_TAG[event.locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return (
    <article className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <p className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">{fecha}</p>
      <h1 className="font-display text-[38px] font-light leading-[1.15] text-ink">{event.title}</h1>
      {/* Dónde es. Sin esto la invitación decía cuándo y de quién, pero no el lugar: el
          invitado tenía que preguntarlo por WhatsApp. */}
      {event.venue === null ? null : <p className="text-[14px] text-ink-soft">{event.venue}</p>}
      <div className="h-px w-16 bg-[var(--color-line)]" />
      {children}
    </article>
  )
}

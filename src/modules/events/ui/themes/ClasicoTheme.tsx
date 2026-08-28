import type { ThemeDefinition, ThemeProps } from './contract'

const LOCALE_TAG = { es: 'es-BO', en: 'en-US' } as const

/**
 * El tema sobrio, que es el que había antes de la colección de dieciséis.
 *
 * Se queda por dos motivos, y ninguno es nostalgia: es el respaldo al que cae una clave
 * que el registro no conoce —`theme_key` en la base es solo texto, y una invitación en
 * blanco el día de la boda es peor que una sobria—, y es el único que no depende de
 * `event_content`, así que un evento sin contenido cargado se ve entero con él.
 */
export function ClasicoTheme({ event, slots }: ThemeProps) {
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
      {slots.rsvp}
      {slots.registry}
      {slots.guestbook}
      {slots.pass}
    </article>
  )
}

export const clasicoDefinition: ThemeDefinition = {
  key: 'clasico',
  label: 'Clásico marfil',
  categorySlug: 'boda',
  palette: {},
  fonts: ['cormorant'],
  // No pinta ninguno de los bloques de la colección: es la hoja sobria con lo que ya
  // guarda `events`. Por eso el panel no le ofrece ninguna sección que rellenar.
  sections: [],
  defaultContent: {},
  Component: ClasicoTheme,
}

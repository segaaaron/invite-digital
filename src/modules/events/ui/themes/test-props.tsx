import { getDictionary } from '@/shared/i18n/dictionaries'
import type { Event } from '../../domain/event'
import type { InvitationContent } from '../../domain/invitation-content'
import type { ThemeProps } from './contract'

export const eventoDePrueba = (over: Partial<Event> = {}): Event => ({
  id: 'e1',
  userId: null,
  slug: 'boda-demo',
  title: 'Marcia & Ricardo',
  eventDate: '2026-10-18',
  rsvpDeadline: '2026-10-01',
  locale: 'es',
  themeKey: 'clasico',
  status: 'live',
  retentionDays: 90,
  currency: 'BOB',
  messageTemplate: null,
  venue: null,
  ...over,
})

/**
 * Las props de un tema, con las cuatro ranuras marcadas.
 *
 * Cada ranura pinta su nombre para que una prueba pueda comprobar **que el diseño la
 * coloca**. Es lo que hay que vigilar: un tema que se olvide de `slots.rsvp` es una
 * invitación en la que nadie puede confirmar, y todo lo demás se ve perfecto.
 */
export function propsDePrueba(over: Partial<ThemeProps> = {}): ThemeProps {
  const diccionario = getDictionary('es')
  return {
    event: eventoDePrueba(),
    content: {} satisfies InvitationContent,
    dictionary: diccionario.invitation,
    themes: diccionario.themes,
    slots: {
      guest: <div>ranura-invitado</div>,
      rsvp: <div>ranura-rsvp</div>,
      registry: <div>ranura-regalos</div>,
      guestbook: <div>ranura-firmas</div>,
      pass: <div>ranura-pase</div>,
    },
    ...over,
  }
}

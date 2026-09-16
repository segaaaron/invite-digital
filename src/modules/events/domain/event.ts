import { err, ok, type Result } from '@/shared/result'
import { LOCALES, type Locale } from '@/shared/i18n/locales'
import { eventError, type EventError } from './errors'

export type EventStatus = 'draft' | 'live' | 'closed'

const STATUSES: readonly string[] = ['draft', 'live', 'closed']
/** Las tres que ofrece la maqueta. Añadir una es una decisión comercial, no técnica. */
export const CURRENCIES = ['BOB', 'USD', 'CAD'] as const
export type Currency = (typeof CURRENCIES)[number]
const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export type Event = {
  readonly id: string
  /**
   * El atelier dueño del evento. Anulable solo porque la columna nació después que los
   * datos; **sin dueño no es «de cualquiera»**: solo el admin lo ve.
   */
  readonly userId: string | null
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly rsvpDeadline: string
  readonly locale: Locale
  readonly themeKey: string
  readonly status: EventStatus
  readonly retentionDays: number
  /** La moneda de la mesa de regalos de este evento. */
  readonly currency: Currency
  /** Plantilla del mensaje de reparto, con {nombre} y {enlace}. */
  readonly messageTemplate: string | null
  /** Dónde es. Lo enseña la vista previa del enlace y la propia invitación. */
  readonly venue: string | null
}

export type EventInput = {
  id: string
  userId?: string | null | undefined
  slug: string
  title: string
  eventDate: string
  rsvpDeadline: string
  locale: string
  themeKey: string
  status: string
  retentionDays: number
  currency?: string | undefined
  messageTemplate?: string | null | undefined
  venue?: string | null | undefined
}

export function createEvent(input: EventInput): Result<Event, EventError> {
  const slug = input.slug.trim()
  if (!SLUG_SHAPE.test(slug)) {
    return err(eventError('invalid_slug', `Slug inválido: "${input.slug}". Solo minúsculas, números y guiones.`))
  }

  const title = input.title.trim()
  if (title.length === 0 || title.length > 160) {
    return err(eventError('invalid_title', 'El título va de 1 a 160 caracteres'))
  }

  if (!ISO_DATE.test(input.eventDate) || !ISO_DATE.test(input.rsvpDeadline)) {
    return err(eventError('invalid_date', 'Las fechas van en formato YYYY-MM-DD'))
  }

  // Comparación lexicográfica: con ISO 'YYYY-MM-DD' equivale a la cronológica y no
  // arrastra la zona horaria que sí traería `new Date`.
  if (input.rsvpDeadline > input.eventDate) {
    return err(eventError('deadline_after_event', 'La fecha límite no puede ser posterior al evento'))
  }

  if (!(LOCALES as readonly string[]).includes(input.locale)) {
    return err(eventError('invalid_locale', `Idioma no soportado: ${input.locale}`))
  }

  if (!STATUSES.includes(input.status)) {
    return err(eventError('invalid_status', `Estado desconocido: ${input.status}`))
  }

  const themeKey = input.themeKey.trim()
  if (themeKey.length === 0) return err(eventError('invalid_theme', 'El evento necesita una plantilla'))

  if (!Number.isInteger(input.retentionDays) || input.retentionDays < 1) {
    return err(eventError('invalid_retention', 'La retención se mide en días enteros y positivos'))
  }

  // Los eventos anteriores a la columna llegan sin moneda: se leen como BOB, que es lo
  // que tenían clavado en el código.
  const currency = input.currency ?? 'BOB'
  if (!(CURRENCIES as readonly string[]).includes(currency)) {
    return err(eventError('invalid_status', `Moneda no soportada: ${currency}`))
  }

  // Un lugar en blanco es «todavía no se sabe dónde», no una cadena vacía en la base.
  const venue = input.venue?.trim() === '' ? null : (input.venue?.trim() ?? null)

  return ok({
    id: input.id,
    userId: input.userId ?? null,
    slug,
    title,
    venue,
    eventDate: input.eventDate,
    rsvpDeadline: input.rsvpDeadline,
    locale: input.locale as Locale,
    themeKey,
    status: input.status as EventStatus,
    retentionDays: input.retentionDays,
    currency: currency as Currency,
    messageTemplate: input.messageTemplate?.trim() === '' ? null : (input.messageTemplate ?? null),
  })
}

/** Solo un evento `live` y dentro del plazo acepta confirmaciones. */
export const acceptsResponses = (event: Event, today: string): boolean =>
  event.status === 'live' && today <= event.rsvpDeadline

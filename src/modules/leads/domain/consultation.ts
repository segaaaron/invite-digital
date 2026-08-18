import type { Locale } from '@/shared/i18n/locales'
import { err, ok, type Result } from '@/shared/result'
import { leadError, type LeadError } from './errors'

export type ConsultationInput = {
  name: string
  email: string
  phone: string
  categorySlug: string
  eventDate: string
  message: string
  locale: Locale
}

export type Consultation = {
  readonly name: string
  readonly email: string | null
  readonly phone: string | null
  readonly categorySlug: string | null
  readonly eventDate: string | null
  readonly message: string | null
  readonly locale: Locale
}

const MIN_NAME_LENGTH = 2
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Keeps digits and a leading plus so `+591 700 11223` stores as `+59170011223`. */
const normalizePhone = (raw: string): string => raw.replace(/[^\d+]/g, '')

const startOfUtcDay = (date: Date): number => Date.parse(`${date.toISOString().slice(0, 10)}T00:00:00Z`)

export function createConsultation(input: ConsultationInput, now: Date): Result<Consultation, LeadError> {
  const name = input.name.trim()
  if (name.length < MIN_NAME_LENGTH) return err(leadError('invalid_name', 'El nombre es obligatorio'))

  const email = input.email.trim()
  const phone = normalizePhone(input.phone.trim())

  if (email.length === 0 && phone.length === 0) {
    return err(leadError('missing_contact', 'Se requiere email o teléfono'))
  }
  if (email.length > 0 && !EMAIL_PATTERN.test(email)) {
    return err(leadError('invalid_email', `Email inválido: ${email}`))
  }

  const eventDate = input.eventDate.trim()
  if (eventDate.length > 0) {
    if (!ISO_DATE_PATTERN.test(eventDate)) {
      return err(leadError('invalid_event_date', `Fecha con formato inválido: ${eventDate}`))
    }

    const parsed = Date.parse(`${eventDate}T00:00:00Z`)
    // Date.parse rolls over: '2026-02-31' silently becomes March 3rd and then Postgres
    // rejects the insert, losing the lead behind a misleading "could not save" message.
    // Round-tripping the date is what catches a day that does not exist.
    if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== eventDate) {
      return err(leadError('invalid_event_date', `Fecha inexistente: ${eventDate}`))
    }

    // Compared by day, not by instant: an event later today is still in the future.
    if (parsed < startOfUtcDay(now)) return err(leadError('past_event_date', 'La fecha del evento ya pasó'))
  }

  return ok({
    name,
    email: email.length > 0 ? email.toLowerCase() : null,
    phone: phone.length > 0 ? phone : null,
    categorySlug: input.categorySlug.trim() || null,
    eventDate: eventDate.length > 0 ? eventDate : null,
    message: input.message.trim() || null,
    locale: input.locale,
  })
}

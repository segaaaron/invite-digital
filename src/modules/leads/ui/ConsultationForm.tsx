'use client'

import { useActionState, useId, useState } from 'react'
import type { Category } from '@/modules/catalog'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { submitConsultationAction, type ConsultationActionState } from '@/app/_acciones/leads/actions'

type Props = { categories: readonly Category[]; dictionary: Dictionary; locale: Locale }

const INITIAL_STATE: ConsultationActionState = { status: 'idle', message: '' }

const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-mute focus-visible:border-gold'

/**
 * La maqueta no pinta etiquetas encima de los campos: el propio campo dice qué se
 * escribe. La etiqueta sigue en el DOM, oculta a la vista, porque un formulario sin
 * etiquetas es un formulario mudo para quien no ve el marcador de posición —y el
 * marcador desaparece en cuanto se empieza a escribir—.
 */
const LABEL_CLASS = 'flex flex-col gap-2'
const LABEL_TEXT = 'sr-only'

export function ConsultationForm({ categories, dictionary, locale }: Props) {
  const [state, formAction, isPending] = useActionState(submitConsultationAction, INITIAL_STATE)
  // Every action result is a fresh object, so remembering the acknowledged one brings
  // the form back on "send another" and still shows the panel after the next success.
  const [acknowledged, setAcknowledged] = useState<ConsultationActionState | null>(null)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const { contact } = dictionary
  const errorId = useId()
  const nameId = useId()
  const lastNameId = useId()
  const emailId = useId()
  const categoryId = useId()
  const dateId = useId()
  const messageId = useId()

  if (state.status === 'success' && acknowledged !== state) {
    return (
      // role="status" so a screen reader announces the receipt: the submit button that
      // held focus disappears with the form, and nothing else would speak.
      <div aria-live="polite" className="flex flex-col items-start gap-4 p-8" role="status">
        <p className="font-display text-[26px] font-light text-ink">{contact.successTitle}</p>
        <p className="text-[14px] leading-[1.7] text-ink-soft">{contact.successBody}</p>
        <button
          className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep underline-offset-4 hover:underline"
          onClick={() => setAcknowledged(state)}
          type="button"
        >
          {contact.again}
        </button>
      </div>
    )
  }

  const errorKind = state.status === 'error' && state.message !== '' ? state.message : null
  const errorText = errorKind ? contact.errors[errorKind] : null

  // The message belongs to the field that caused it: pointing every input at the same
  // error makes a screen reader read "the date is in the past" while focusing the name.
  const FIELD_ERRORS: Record<string, ReadonlyArray<'name' | 'email' | 'phone' | 'eventDate'>> = {
    invalid_name: ['name'],
    invalid_email: ['email'],
    // El formulario ya no pide teléfono —la maqueta no lo tiene—, así que el correo es el
    // único camino de vuelta y es quien carga con este error.
    missing_contact: ['email'],
    past_event_date: ['eventDate'],
    invalid_event_date: ['eventDate'],
  }
  const blamed = errorKind ? (FIELD_ERRORS[errorKind] ?? []) : []
  const describedBy = (field: 'name' | 'email' | 'phone' | 'eventDate') =>
    blamed.includes(field) ? errorId : undefined
  const invalid = (field: 'name' | 'email' | 'phone' | 'eventDate') => blamed.includes(field) || undefined

  return (
    <form action={formAction} className="flex flex-col gap-5 p-8">
      <input name="locale" type="hidden" value={locale} readOnly />

      {/* El dominio guarda un nombre completo y la maqueta lo pide en dos campos: se unen
          al escribir, en un campo oculto, en vez de partir la tabla en dos columnas. */}
      <input name="name" type="hidden" value={`${nombre} ${apellido}`.trim()} readOnly />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL_CLASS} htmlFor={nameId}>
          <span className={LABEL_TEXT}>{contact.fields.name}</span>
          <input
            aria-describedby={describedBy('name')}
            aria-invalid={invalid('name')}
            className={FIELD_CLASS}
            id={nameId}
            maxLength={80}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={contact.fields.name}
            required
            type="text"
            value={nombre}
          />
        </label>

        <label className={LABEL_CLASS} htmlFor={lastNameId}>
          <span className={LABEL_TEXT}>{contact.fields.lastName}</span>
          <input
            className={FIELD_CLASS}
            id={lastNameId}
            maxLength={80}
            onChange={(e) => setApellido(e.target.value)}
            placeholder={contact.fields.lastName}
            required
            type="text"
            value={apellido}
          />
        </label>
      </div>

      <label className={LABEL_CLASS} htmlFor={emailId}>
        <span className={LABEL_TEXT}>{contact.fields.email}</span>
        <input
          aria-describedby={describedBy('email')}
          aria-invalid={invalid('email')}
          className={FIELD_CLASS}
          id={emailId}
          maxLength={200}
          name="email"
          placeholder={contact.fields.email}
          required
          type="email"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL_CLASS} htmlFor={dateId}>
          <span className={LABEL_TEXT}>{`${contact.fields.date} (${contact.fields.optional})`}</span>
          <input
            aria-describedby={describedBy('eventDate')}
            aria-invalid={invalid('eventDate')}
            className={FIELD_CLASS}
            id={dateId}
            name="eventDate"
            type="date"
          />
        </label>

        <label className={LABEL_CLASS} htmlFor={categoryId}>
          <span className={LABEL_TEXT}>{contact.fields.category}</span>
          <select className={FIELD_CLASS} defaultValue="" id={categoryId} name="categorySlug">
            <option value="">{contact.fields.categoryAny}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={LABEL_CLASS} htmlFor={messageId}>
        <span className={LABEL_TEXT}>{contact.fields.message}</span>
        <textarea
          className={FIELD_CLASS}
          id={messageId}
          maxLength={2000}
          name="message"
          placeholder={contact.fields.message}
          rows={4}
        />
      </label>

      {errorText ? (
        <p className="text-[13px] leading-[1.6] text-gold-deep" id={errorId} role="alert">
          {errorText}
        </p>
      ) : null}

      <button
        className="mt-1 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised shadow-[var(--shadow-float)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={isPending}
        type="submit"
      >
        {isPending ? contact.sending : contact.submit}
      </button>
    </form>
  )
}

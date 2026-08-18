'use client'

import { useActionState, useId, useState } from 'react'
import type { Category } from '@/modules/catalog'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import type { Locale } from '@/shared/i18n/locales'
import { submitConsultationAction, type ConsultationActionState } from '../actions'

type Props = { categories: readonly Category[]; dictionary: Dictionary; locale: Locale }

const INITIAL_STATE: ConsultationActionState = { status: 'idle', message: '' }

const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-mute focus-visible:border-gold'

const LABEL_CLASS = 'flex flex-col gap-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute'

export function ConsultationForm({ categories, dictionary, locale }: Props) {
  const [state, formAction, isPending] = useActionState(submitConsultationAction, INITIAL_STATE)
  // Every action result is a fresh object, so remembering the acknowledged one brings
  // the form back on "send another" and still shows the panel after the next success.
  const [acknowledged, setAcknowledged] = useState<ConsultationActionState | null>(null)
  const { contact } = dictionary
  const errorId = useId()
  const nameId = useId()
  const emailId = useId()
  const phoneId = useId()
  const categoryId = useId()
  const dateId = useId()
  const messageId = useId()

  if (state.status === 'success' && acknowledged !== state) {
    return (
      <div className="flex flex-col items-start gap-4 p-8">
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

  const errorText = state.status === 'error' && state.message !== '' ? contact.errors[state.message] : null

  return (
    <form action={formAction} className="flex flex-col gap-5 p-8">
      <input name="locale" type="hidden" value={locale} readOnly />

      <label className={LABEL_CLASS} htmlFor={nameId}>
        {contact.fields.name}
        <input
          aria-describedby={errorText ? errorId : undefined}
          className={FIELD_CLASS}
          id={nameId}
          maxLength={160}
          name="name"
          required
          type="text"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL_CLASS} htmlFor={emailId}>
          {contact.fields.email}
          <input
            aria-describedby={errorText ? errorId : undefined}
            className={FIELD_CLASS}
            id={emailId}
            maxLength={200}
            name="email"
            type="email"
          />
        </label>

        <label className={LABEL_CLASS} htmlFor={phoneId}>
          {contact.fields.phone}
          <input
            aria-describedby={errorText ? errorId : undefined}
            className={FIELD_CLASS}
            id={phoneId}
            maxLength={32}
            name="phone"
            type="tel"
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL_CLASS} htmlFor={categoryId}>
          {contact.fields.category}
          <select className={FIELD_CLASS} defaultValue="" id={categoryId} name="categorySlug">
            <option value="">{contact.fields.categoryAny}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL_CLASS} htmlFor={dateId}>
          {`${contact.fields.date} (${contact.fields.optional})`}
          <input className={FIELD_CLASS} id={dateId} name="eventDate" type="date" />
        </label>
      </div>

      <label className={LABEL_CLASS} htmlFor={messageId}>
        {contact.fields.message}
        <textarea className={FIELD_CLASS} id={messageId} maxLength={2000} name="message" rows={4} />
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

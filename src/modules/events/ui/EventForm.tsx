'use client'

import { useActionState, useId } from 'react'
import { createEventAction, updateEventAction, type EventActionState } from '../actions'
import type { Event } from '../domain/event'
import type { EventErrorKind } from '../domain/errors'
import { ThemePicker } from './ThemePicker'
import { themeDefinitions } from './themes/registry'

const INITIAL: EventActionState = { status: 'idle', message: '' }

const MESSAGES: Record<EventErrorKind, string> = {
  invalid_slug: 'El identificador solo admite minúsculas, números y guiones.',
  invalid_title: 'El título va de 1 a 160 caracteres.',
  invalid_date: 'Revisa las fechas.',
  deadline_after_event: 'La fecha límite no puede ser posterior al evento.',
  invalid_locale: 'Idioma no soportado.',
  invalid_status: 'Estado desconocido.',
  invalid_theme: 'Elige una plantilla.',
  invalid_retention: 'La retención se mide en días enteros y positivos.',
  duplicate_slug: 'Ya existe un evento con ese identificador.',
  not_found: 'Ese evento ya no existe.',
  storage_failure: 'No pudimos guardar el evento. Inténtalo en un momento.',
}

const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'

const LABEL_CLASS = 'flex flex-col gap-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute'

export function EventForm({ event }: { event?: Event }) {
  const [state, formAction, isPending] = useActionState(event ? updateEventAction : createEventAction, INITIAL)
  const slugId = useId()
  const titleId = useId()
  const venueId = useId()
  const dateId = useId()
  const deadlineId = useId()
  const localeId = useId()
  const statusId = useId()
  const retentionId = useId()
  const currencyId = useId()
  const templateId = useId()
  const errorId = useId()

  const error = state.status === 'error' && state.message !== '' ? MESSAGES[state.message] : null

  return (
    <form action={formAction} className="flex max-w-[560px] flex-col gap-5">
      {event ? <input name="id" type="hidden" value={event.id} readOnly /> : null}

      <label className={LABEL_CLASS} htmlFor={titleId}>
        Título
        <input className={FIELD_CLASS} defaultValue={event?.title} id={titleId} maxLength={160} name="title" required type="text" />
      </label>

      <label className={LABEL_CLASS} htmlFor={slugId}>
        Identificador
        <input className={FIELD_CLASS} defaultValue={event?.slug} id={slugId} maxLength={64} name="slug" required type="text" />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL_CLASS} htmlFor={dateId}>
          Fecha del evento
          <input className={FIELD_CLASS} defaultValue={event?.eventDate} id={dateId} name="eventDate" required type="date" />
        </label>

        <label className={LABEL_CLASS} htmlFor={deadlineId}>
          Fecha límite de confirmación
          <input className={FIELD_CLASS} defaultValue={event?.rsvpDeadline} id={deadlineId} name="rsvpDeadline" required type="date" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL_CLASS} htmlFor={localeId}>
          Idioma de la invitación
          <select className={FIELD_CLASS} defaultValue={event?.locale ?? 'es'} id={localeId} name="locale">
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>
        </label>

      </div>

      {/* El diseño se elige mirándolo, no leyendo su nombre en un desplegable de
          diecisiete claves. La rejilla pinta el papel con la paleta real de cada tema y
          cada tarjeta enlaza a la invitación entera. */}
      <ThemePicker
        defaultValue={event?.themeKey ?? 'clasico'}
        definitions={themeDefinitions().map((definicion) => ({
          key: definicion.key,
          label: definicion.label,
          categorySlug: definicion.categorySlug,
          palette: definicion.palette,
          sample:
            definicion.defaultContent.hero === undefined
              ? null
              : {
                  monogram: definicion.defaultContent.hero.monogram ?? '·',
                  names: [definicion.defaultContent.hero.nameA, definicion.defaultContent.hero.nameB]
                    .filter((nombre): nombre is string => nombre !== undefined)
                    .join('\n'),
                },
        }))}
        locale={event?.locale ?? 'es'}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL_CLASS} htmlFor={statusId}>
          Estado
          <select className={FIELD_CLASS} defaultValue={event?.status ?? 'draft'} id={statusId} name="status">
            <option value="draft">Borrador · sin enlaces activos</option>
            <option value="live">En marcha · los invitados responden</option>
            <option value="closed">Cerrado · enlaces válidos, respuestas cerradas</option>
          </select>
        </label>

        <label className={LABEL_CLASS} htmlFor={retentionId}>
          Retención de datos (días)
          <input className={FIELD_CLASS} defaultValue={event?.retentionDays ?? 90} id={retentionId} min={1} name="retentionDays" required type="number" />
        </label>
      </div>

      <label className={LABEL_CLASS} htmlFor={venueId}>
        Lugar / Venue
        <input
          className={FIELD_CLASS}
          defaultValue={event?.venue ?? ''}
          id={venueId}
          maxLength={160}
          name="venue"
          placeholder="Hacienda Los Encinos, Cochabamba"
          type="text"
        />
      </label>

      <label className={LABEL_CLASS} htmlFor={templateId}>
        Plantilla del mensaje de reparto
        <textarea
          className={FIELD_CLASS}
          defaultValue={event?.messageTemplate ?? ''}
          id={templateId}
          name="messageTemplate"
          placeholder="Hola {grupo}: nos encantaría celebrar con ustedes. Aquí está su invitación: {enlace}"
          rows={3}
        />
        <span className="text-[11px] text-ink-mute">
          {'{grupo}'} y {'{enlace}'} se sustituyen al enviar. El enlace nunca se guarda aquí.
        </span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL_CLASS} htmlFor={currencyId}>
          Moneda de la mesa de regalos
          <select className={FIELD_CLASS} defaultValue={event?.currency ?? 'BOB'} id={currencyId} name="currency">
            <option value="BOB">BOB — Boliviano</option>
            <option value="USD">USD — Dólar (EE. UU.)</option>
            <option value="CAD">CAD — Dólar canadiense</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="text-[13px] text-gold-deep" id={errorId} role="alert">
          {error}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <p aria-live="polite" className="text-[13px] text-ink-soft" role="status">
          Evento guardado.
        </p>
      ) : null}

      <button
        className="w-fit cursor-pointer rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Guardando…' : event ? 'Guardar cambios' : 'Crear evento'}
      </button>
    </form>
  )
}

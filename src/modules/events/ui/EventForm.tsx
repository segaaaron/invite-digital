'use client'

import { CampoFecha } from '@/shared/design/ui/panel/campos-de-fecha'
import { useActionState, useId, type ReactNode } from 'react'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { CATALOG_KEYS, seAsigna } from '@/shared/design/theme-catalog'
import { createEventAction, updateEventAction, type EventActionState } from '@/app/_acciones/events/actions'
import type { Event } from '../domain/event'
import type { EventErrorKind } from '../domain/errors'
import { mismaFiesta } from '../domain/fiesta'
import { ThemePicker } from './ThemePicker'
import type { ThemeDefinition } from './themes/contract'
import { themeDefinitions, themeFor } from './themes/registry'
import { SubmitButton } from '@/shared/design/ui/panel/estados'

const INITIAL: EventActionState = { status: 'idle', message: '' }

const MESSAGES: Record<EventErrorKind, string> = {
  invalid_slug: 'El enlace del evento solo admite minúsculas, números y guiones.',
  invalid_title: 'El título va de 1 a 160 caracteres.',
  invalid_date: 'Revisa las fechas.',
  deadline_after_event: 'La fecha límite no puede ser posterior al evento.',
  invalid_locale: 'Idioma no soportado.',
  invalid_status: 'Estado desconocido.',
  invalid_theme: 'Elige un diseño de la lista.',
  invalid_retention: 'La retención se mide en días enteros y positivos.',
  duplicate_slug: 'Ya existe un evento con ese enlace.',
  not_found: 'Ese evento ya no existe.',
  storage_failure: 'No pudimos guardar el evento. Inténtalo en un momento.',
}

/**
 * Crear o editar un evento, con la piel del panel y en tres bloques: el evento, su diseño y
 * cómo se reparte. Los nombres de los campos del formulario no cambian: la acción es la misma.
 */
export function EventForm({
  event,
  diseno,
}: {
  event?: Event
  /** Si el plan fija el modelo, el motivo. Sin esto se ofrecen los de su misma fiesta. */
  diseno?: { fijo: string } | undefined
}) {
  const [state, formAction, isPending] = useActionState(event ? updateEventAction : createEventAction, INITIAL)
  const slugId = useId()
  const titleId = useId()
  const venueId = useId()
  const dateId = useId()
  const deadlineId = useId()
  const localeId = useId()
  const statusId = useId()
  const currencyId = useId()
  const templateId = useId()
  const errorId = useId()

  const error = state.status === 'error' && state.message !== '' ? MESSAGES[state.message] : null

  return (
    <form action={formAction} className="@container flex max-w-[640px] flex-col gap-8">
      {event ? <input name="id" type="hidden" value={event.id} readOnly /> : null}

      <Bloque titulo="El evento">
        <Campo etiqueta="Título" htmlFor={titleId}>
          <input className={FIELD_CLASS} defaultValue={event?.title} id={titleId} maxLength={160} name="title" required type="text" />
        </Campo>

        {/* El enlace interno solo se escribe al crear. Después no se enseña: cambiarlo rompía
            los accesos directos y no servía para nada que se viera fuera del panel. */}
        {event ? (
          <input name="slug" readOnly type="hidden" value={event.slug} />
        ) : (
          <Campo ayuda="Minúsculas, números y guiones. Es la dirección del evento dentro del panel." etiqueta="Enlace del evento" htmlFor={slugId}>
            <div className="flex items-center overflow-hidden rounded-[14px] border border-line-panel-strong bg-white focus-within:border-ink">
              <span aria-hidden className="shrink-0 pl-4 font-mono text-[12px] text-ink-mute">
                /panel/eventos/
              </span>
              <input
                className="w-full min-w-0 bg-transparent py-3 pr-4 text-[14px] text-ink outline-none"
                id={slugId}
                maxLength={64}
                name="slug"
                required
                type="text"
              />
            </div>
          </Campo>
        )}

        <div className="grid gap-5 @min-[560px]:grid-cols-2">
          <Campo etiqueta="Fecha del evento" htmlFor={dateId}>
            <CampoFecha defaultValue={event?.eventDate ?? ''} id={dateId} name="eventDate" required />
          </Campo>
          <Campo etiqueta="Fecha límite de confirmación" htmlFor={deadlineId}>
            <CampoFecha defaultValue={event?.rsvpDeadline ?? ''} id={deadlineId} name="rsvpDeadline" required />
          </Campo>
        </div>

        <div className="grid gap-5 @min-[440px]:grid-cols-2">
          <Campo etiqueta="Idioma de la invitación" htmlFor={localeId}>
            <select className={FIELD_CLASS} defaultValue={event?.locale ?? 'es'} id={localeId} name="locale">
              <option value="es">Español</option>
              <option value="en">Inglés</option>
            </select>
          </Campo>
          <Campo etiqueta="Lugar" htmlFor={venueId}>
            <input
              className={FIELD_CLASS}
              defaultValue={event?.venue ?? ''}
              id={venueId}
              maxLength={160}
              name="venue"
              placeholder="Hacienda Los Encinos, Cochabamba"
              type="text"
            />
          </Campo>
        </div>
      </Bloque>

      <Bloque titulo="Diseño">
        {event && diseno ? (
          // El plan no deja cambiarlo: se enseña cuál es y por qué. El servidor lo conserva
          // igual aunque llegue otro por POST.
          <div className="flex flex-col gap-1">
            <input name="themeKey" readOnly type="hidden" value={event.themeKey} />
            <p className="text-[14px] text-ink">{themeFor(event.themeKey).label}</p>
            <p className="text-[12px] text-ink-mute">{diseno.fijo}</p>
          </div>
        ) : event ? (
          // **En un evento creado, el diseño solo cambia por otro de la misma fiesta**: unos XV
          // por otros XV, una boda por otra boda. La otra fiesta ni se ofrece, y
          // `updateEventAction` lo rechaza también en el servidor.
          <ThemePicker
            defaultValue={event.themeKey}
            definitions={opcionesDeDiseno(themeDefinitions().filter((definicion) => mismaFiesta(definicion.categorySlug, themeFor(event.themeKey).categorySlug)), event.themeKey)}
            locale={event.locale}
          />
        ) : (
          // El diseño se elige mirándolo, primero el tipo de fiesta y luego sus modelos.
          <ThemePicker defaultValue="" definitions={opcionesDeDiseno(themeDefinitions())} locale="es" />
        )}
      </Bloque>

      <Bloque titulo="Reparto y datos">
        <div className="grid gap-5 @min-[440px]:grid-cols-2">
          <Campo etiqueta="Estado" htmlFor={statusId}>
            <select className={FIELD_CLASS} defaultValue={event?.status ?? 'draft'} id={statusId} name="status">
              <option value="draft">Borrador · sin enlaces activos</option>
              <option value="live">En marcha · los invitados responden</option>
              <option value="closed">Cerrado · enlaces válidos, respuestas cerradas</option>
            </select>
          </Campo>
          <div className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Tiempo en línea</span>
            <p className="text-[13px] text-ink">
              {event ? `${event.retentionDays} días tras el evento` : 'Lo que diga el plan'}
            </p>
            <p className="text-[11px] text-ink-mute">Lo fija el plan. Pasado ese tiempo, los datos de los invitados se anonimizan.</p>
          </div>
        </div>

        <Campo ayuda="{nombre}, {fecha}, {evento} y {enlace} se sustituyen al enviar. Vacío, se usa un mensaje cordial con la fecha. El enlace nunca se guarda aquí." etiqueta="Mensaje para repartir la invitación" htmlFor={templateId}>
          <textarea
            className={FIELD_CLASS}
            defaultValue={event?.messageTemplate ?? ''}
            id={templateId}
            name="messageTemplate"
            placeholder="Hola {nombre} ✨ Con mucha alegría queremos compartir contigo un día muy especial: el {fecha}. Aquí está tu invitación: {enlace}"
            rows={3}
          />
        </Campo>

        <div className="grid gap-5 @min-[440px]:grid-cols-2">
          <Campo etiqueta="Moneda de la mesa de regalos" htmlFor={currencyId}>
            <select className={FIELD_CLASS} defaultValue={event?.currency ?? 'BOB'} id={currencyId} name="currency">
              <option value="BOB">BOB — Boliviano</option>
              <option value="USD">USD — Dólar (EE. UU.)</option>
              <option value="CAD">CAD — Dólar canadiense</option>
            </select>
          </Campo>
        </div>
      </Bloque>

      {error ? (
        <p className="text-[13px] text-danger" id={errorId} role="alert">
          {error}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <p aria-live="polite" className="text-[13px] text-ink-soft" role="status">
          Evento guardado.
        </p>
      ) : null}

      <SubmitButton variant="primary" pending={isPending} pendingLabel={'Guardando…'}>{event ? 'Guardar cambios' : 'Crear evento'}</SubmitButton>
    </form>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h3 className="border-b border-line-panel pb-2 font-display text-[20px] text-ink">{titulo}</h3>
      {children}
    </section>
  )
}

function Campo({ etiqueta, htmlFor, ayuda, children }: { etiqueta: string; htmlFor: string; ayuda?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label className={LABEL_CLASS} htmlFor={htmlFor}>
        {etiqueta}
      </label>
      {children}
      {ayuda ? <p className="text-[11px] leading-[1.5] text-ink-mute">{ayuda}</p> : null}
    </div>
  )
}

/**
 * Los diseños que se ofrecen, con su portada. El clásico no: no está en el catálogo, es el
 * respaldo de una clave desconocida y nadie lo elige mirando la web. Los retirados tampoco,
 * salvo el que el evento ya tiene (`actual`): quitárselo de la vista lo cambiaría sin querer.
 */
function opcionesDeDiseno(definiciones: readonly ThemeDefinition[], actual?: string) {
  return definiciones
    .filter((definicion) => seAsigna(definicion.key) || definicion.key === actual)
    .map((definicion) => ({
      key: definicion.key,
      label: definicion.label,
      categorySlug: definicion.categorySlug,
      palette: definicion.palette,
      cover: CATALOG_KEYS.includes(definicion.key) ? `/templates/${definicion.key}.avif` : null,
      sample:
        definicion.defaultContent.hero === undefined
          ? null
          : {
              monogram: definicion.defaultContent.hero.monogram ?? '·',
              names: [definicion.defaultContent.hero.nameA, definicion.defaultContent.hero.nameB]
                .filter((nombre): nombre is string => nombre !== undefined)
                .join('\n'),
            },
    }))
}

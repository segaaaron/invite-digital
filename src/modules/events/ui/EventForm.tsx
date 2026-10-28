'use client'

import { CampoFecha } from '@/shared/design/ui/panel/campos-de-fecha'
import Link from 'next/link'
import { useActionState, useId, useState, type ReactNode } from 'react'
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
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useIdioma, useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

const INITIAL: EventActionState = { status: 'idle', message: '' }

const mensajes = (t: T): Record<EventErrorKind, string> => ({
  invalid_slug: t('El enlace del evento solo admite minúsculas, números y guiones.', 'The event link only allows lowercase letters, numbers and hyphens.'),
  invalid_title: t('El título va de 1 a 160 caracteres.', 'The title must be 1 to 160 characters.'),
  invalid_date: t('Revisa las fechas.', 'Check the dates.'),
  deadline_after_event: t('La fecha límite no puede ser posterior al evento.', 'The deadline can’t be after the event.'),
  invalid_locale: t('Idioma no soportado.', 'Unsupported language.'),
  invalid_status: t('Estado desconocido.', 'Unknown status.'),
  invalid_theme: t('Elige un diseño de la lista.', 'Choose a design from the list.'),
  invalid_retention: t('La retención se mide en días enteros y positivos.', 'Retention is measured in whole, positive days.'),
  duplicate_slug: t('Ya existe un evento con ese enlace.', 'An event with that link already exists.'),
  not_found: t('Ese evento ya no existe.', 'That event no longer exists.'),
  storage_failure: t('No pudimos guardar el evento. Inténtalo en un momento.', 'We couldn’t save the event. Try again in a moment.'),
})

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
  const t = useT()
  const locale = useIdioma()
  const [state, formAction, isPending] = useActionState(sinCaerse(event ? updateEventAction : createEventAction), INITIAL)
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
  // El enlace se arma solo con el título (16 oct: pedirlo a mano, con «/dashboard/events/» delante, era jerga);
  // si se toca, manda lo escrito.
  const [slug, setSlug] = useState('')
  const [slugTocado, setSlugTocado] = useState(false)

  const error = state.status === 'error' && state.message !== '' ? mensajes(t)[state.message] : null

  return (
    <form action={formAction} className="@container flex max-w-[640px] flex-col gap-8">
      {event ? <input name="id" type="hidden" value={event.id} readOnly /> : null}

      <Bloque titulo={t('El evento', 'The event')}>
        <Campo etiqueta={t('Título', 'Title')} htmlFor={titleId}>
          <input
            className={FIELD_CLASS}
            defaultValue={event?.title}
            id={titleId}
            maxLength={160}
            name="title"
            onChange={event ? undefined : (e) => (slugTocado ? undefined : setSlug(aSlug(e.target.value)))}
            required
            type="text"
          />
        </Campo>

        {/* El enlace interno solo se escribe al crear. Después no se enseña: cambiarlo rompía
            los accesos directos y no servía para nada que se viera fuera del panel. */}
        {event ? (
          <input name="slug" readOnly type="hidden" value={event.slug} />
        ) : (
          <Campo ayuda={t('Se arma solo con el título. Si lo cambias: minúsculas, números y guiones.', 'It is built from the title. If you change it: lowercase letters, numbers and hyphens.')} etiqueta={t('Enlace del evento', 'Event link')} htmlFor={slugId}>
            <input
              className={FIELD_CLASS}
              id={slugId}
              maxLength={64}
              name="slug"
              onChange={(e) => {
                setSlugTocado(true)
                setSlug(e.target.value)
              }}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
              type="text"
              value={slug}
            />
          </Campo>
        )}

        <div className="grid gap-5 @min-[560px]:grid-cols-2">
          <Campo etiqueta={t('Fecha del evento', 'Event date')} htmlFor={dateId}>
            <CampoFecha defaultValue={event?.eventDate ?? ''} id={dateId} name="eventDate" required />
          </Campo>
          <Campo etiqueta={t('Fecha límite de confirmación', 'RSVP deadline')} htmlFor={deadlineId}>
            <CampoFecha defaultValue={event?.rsvpDeadline ?? ''} id={deadlineId} name="rsvpDeadline" required />
          </Campo>
        </div>

        <div className="grid gap-5 @min-[440px]:grid-cols-2">
          <Campo etiqueta={t('Idioma de la invitación', 'Invitation language')} htmlFor={localeId}>
            <select className={FIELD_CLASS} defaultValue={event?.locale ?? 'es'} id={localeId} name="locale">
              <option value="es">{t('Español', 'Spanish')}</option>
              <option value="en">{t('Inglés', 'English')}</option>
            </select>
          </Campo>
          <Campo etiqueta={t('Lugar', 'Place')} htmlFor={venueId}>
            <input
              className={FIELD_CLASS}
              defaultValue={event?.venue ?? ''}
              id={venueId}
              maxLength={160}
              name="venue"
              placeholder={t('Hacienda Los Encinos, Cochabamba', 'Hacienda Los Encinos, Cochabamba')}
              type="text"
            />
          </Campo>
        </div>
      </Bloque>

      <Bloque titulo={t('Diseño', 'Design')}>
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
          // Plegado (16 oct): la rejilla entera de diseños alargaba la ficha varias pantallas. Cerrado, el elegido
          // viaja igual en el formulario.
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-[10px] border border-line-panel-strong bg-bg-raised px-4 text-[14.5px] [&::-webkit-details-marker]:hidden">
              <span>
                <span className="text-ink-mute">{t('Diseño actual:', 'Current design:')}</span> <span className="font-medium">{themeFor(event.themeKey).label}</span>
              </span>
              <span className="font-medium text-gold-deep group-open:hidden">{t('Cambiar', 'Change')}</span>
              <span className="hidden font-medium text-gold-deep group-open:inline">{t('Cerrar', 'Close')}</span>
            </summary>
            <div className="mt-4">
              <ThemePicker
                defaultValue={event.themeKey}
                definitions={opcionesDeDiseno(themeDefinitions().filter((definicion) => mismaFiesta(definicion.categorySlug, themeFor(event.themeKey).categorySlug)), event.themeKey, t)}
                locale={event.locale}
              />
            </div>
          </details>
        ) : (
          // El diseño se elige mirándolo, primero el tipo de fiesta y luego sus modelos.
          <ThemePicker defaultValue="" definitions={opcionesDeDiseno(themeDefinitions(), undefined, t)} locale={locale} />
        )}
      </Bloque>

      <Bloque titulo={t('Reparto y datos', 'Sending and data')}>
        <div className="grid gap-5 @min-[440px]:grid-cols-2">
          <Campo etiqueta={t('Estado', 'Status')} htmlFor={statusId}>
            <select className={FIELD_CLASS} defaultValue={event?.status ?? 'draft'} id={statusId} name="status">
              <option value="draft">{t('Borrador · sin enlaces activos', 'Draft · no active links')}</option>
              <option value="live">{t('En marcha · los invitados responden', 'Live · guests are replying')}</option>
              <option value="closed">{t('Cerrado · enlaces válidos, respuestas cerradas', 'Closed · links valid, replies closed')}</option>
            </select>
          </Campo>
          <div className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>{t('Tiempo en línea', 'Time online')}</span>
            <p className="text-[13px] text-ink">
              {event ? t(`${event.retentionDays} días tras el evento`, `${event.retentionDays} days after the event`) : t('Lo que diga el plan', 'Whatever the plan says')}
            </p>
            <p className="text-[12px] text-ink-mute">{t('Lo fija el plan. Pasado ese tiempo, los datos de los invitados se anonimizan.', 'The plan sets it. After that time, guests’ data is anonymized.')}</p>
          </div>
        </div>

        <Campo ayuda={t('{nombre}, {fecha}, {evento} y {enlace} se sustituyen al enviar. Si no pones {nombre}, empieza con «Hola Nombre»; si no pones {enlace}, el enlace va al final. Vacío, se usa un mensaje cordial con la fecha.', '{nombre}, {fecha}, {evento} and {enlace} are replaced when sending. If you don’t include {nombre}, it starts with “Hi Name”; if you don’t include {enlace}, the link goes at the end. Empty, a friendly message with the date is used.')} etiqueta={t('Mensaje para repartir la invitación', 'Message to send the invitation')} htmlFor={templateId}>
          <textarea
            className={FIELD_CLASS}
            defaultValue={event?.messageTemplate ?? ''}
            id={templateId}
            name="messageTemplate"
            placeholder={t('Hola {nombre} ✨ Con mucha alegría queremos compartir contigo un día muy especial: el {fecha}. Aquí está tu invitación: {enlace}', 'Hi {nombre} ✨ We’re so happy to share a very special day with you: {fecha}. Here is your invitation: {enlace}')}
            rows={3}
          />
        </Campo>

        <div className="grid gap-5 @min-[440px]:grid-cols-2">
          <Campo etiqueta={t('Moneda de la mesa de regalos', 'Gift registry currency')} htmlFor={currencyId}>
            <select className={FIELD_CLASS} defaultValue={event?.currency ?? 'BOB'} id={currencyId} name="currency">
              <option value="BOB">{t('BOB — Boliviano', 'BOB — Boliviano')}</option>
              <option value="USD">{t('USD — Dólar (EE. UU.)', 'USD — US Dollar')}</option>
              <option value="CAD">{t('CAD — Dólar canadiense', 'CAD — Canadian Dollar')}</option>
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
          {t('Evento guardado.', 'Event saved.')}{' '}
          {event ? null : (
            <Link className="underline underline-offset-4" href="/dashboard">
              {t('Ver mis eventos', 'See my events')}
            </Link>
          )}
        </p>
      ) : null}

      {/* Un alta hecha no se repite: otro clic crearía el mismo evento dos veces. */}
      <SubmitButton disabled={!event && state.status === 'success'} variant="primary" pending={isPending} pendingLabel={t('Guardando…', 'Saving…')}>
        {event ? t('Guardar cambios', 'Save changes') : state.status === 'success' ? t('Creado ✓', 'Created ✓') : t('Crear evento', 'Create event')}
      </SubmitButton>
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
      {ayuda ? <p className="text-[12px] leading-[1.5] text-ink-mute">{ayuda}</p> : null}
    </div>
  )
}

/**
 * Los diseños que se ofrecen, con su portada. El clásico no: no está en el catálogo, es el
 * respaldo de una clave desconocida y nadie lo elige mirando la web. Los retirados tampoco,
 * salvo el que el evento ya tiene (`actual`): quitárselo de la vista lo cambiaría sin querer.
 */
function opcionesDeDiseno(definiciones: readonly ThemeDefinition[], actual: string | undefined, t: T) {
  // Un evento con un diseño que ya no existe en el registro (anterior al catálogo): se ofrece
  // igual, **marcado**, como «su diseño actual». Sin esto el selector marcaba el primero de la
  // lista y guardar cualquier otro dato le cambiaba el diseño sin que nadie lo pidiera.
  const huerfano =
    actual !== undefined && actual !== '' && !definiciones.some((d) => d.key === actual)
      ? [{ key: actual, label: t('Su diseño actual (ya no está en el catálogo)', 'Their current design (no longer in the catalog)'), categorySlug: themeFor(actual).categorySlug, palette: themeFor(actual).palette, cover: null, sample: null }]
      : []
  return [
    ...huerfano,
    ...definiciones
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
    })),
  ]
}

/** «Boda de Ana & Luis» → «boda-de-ana-luis»: lo que acepta el enlace del evento. */
function aSlug(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/, '')
}

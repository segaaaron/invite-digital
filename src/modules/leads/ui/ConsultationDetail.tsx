'use client'

import Link from 'next/link'
import { BRAND } from '@/shared/config/brand'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { moveConsultationAction, type InboxActionState } from '@/app/_acciones/leads/actions'
import { destinosDesde, ETIQUETA_ESTADO, type EstadoConsulta } from '../domain/pipeline'
import { whatsAppToCustomer } from '../domain/whatsapp-link'
import { ActionFeedback } from '@/shared/design/ui/panel/estados'

const INICIAL: InboxActionState = { status: 'idle' }

const TONO: Record<EstadoConsulta, PillTone> = { new: 'maybe', contacted: 'pending', won: 'ok', lost: 'no' }

/** El verbo del botón, no el nombre del estado: se pulsa para hacer algo. */
const ACCION: Record<EstadoConsulta, string> = {
  new: 'Volver a nueva',
  contacted: 'Contactada',
  won: 'Ganada',
  lost: 'Perdida',
}

export type ConsultationView = {
  readonly id: string
  readonly name: string
  readonly email: string | null
  readonly phone: string | null
  readonly category: string | null
  /** Ya formateada en la página: el servidor y el navegador no tienen por qué coincidir. */
  readonly eventDateLabel: string | null
  readonly message: string | null
  readonly status: EstadoConsulta
  readonly note: string | null
  readonly receivedLabel: string
  /** «15 sept»: la fecha corta de la lista. */
  readonly shortDateLabel: string
  readonly event: { readonly slug: string; readonly title: string } | null
  /** Solo en las nuevas: cuánto lleva sin contestar (`esperaDeConsulta`). */
  readonly espera: { readonly texto: string; readonly urgente: boolean } | null
}

/**
 * El detalle de una consulta, a la derecha de la bandeja (patrón lista + detalle de los
 * clientes de correo y los CRM): quién es y qué pidió arriba, cómo contestar y a qué estado
 * pasa abajo. Lleva **su propio estado** de acción.
 */
export function ConsultationDetail({
  consulta,
  eventos,
}: {
  consulta: ConsultationView
  /** Los eventos a los que se puede enlazar al ganarla. */
  eventos: readonly { id: string; title: string }[]
}) {
  const [estado, mover, moviendo] = useActionState(moveConsultationAction, INICIAL)
  const id = useId()
  const destinos = destinosDesde(consulta.status)

  const whatsapp = whatsAppToCustomer(
    consulta.phone,
    `Hola ${consulta.name.split(' ')[0] ?? ''}, te escribimos de ${BRAND.siteName} por tu consulta en la web.`,
  )

  return (
    <article aria-label={`Consulta de ${consulta.name}`} className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line-panel pb-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-bg-sunken font-display text-[20px] text-ink-soft uppercase">
            {consulta.name.slice(0, 1)}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="truncate font-display text-[24px] leading-tight text-ink">{consulta.name}</h2>
            <p className="text-[12.5px] text-ink-mute">{consulta.receivedLabel}</p>
          </div>
        </div>
        <Pill tone={TONO[consulta.status]}>{ETIQUETA_ESTADO[consulta.status]}</Pill>
      </header>

      <dl className="grid gap-4 min-[560px]:grid-cols-2">
        {(
          [
            ['Qué celebra', consulta.category],
            ['Fecha del evento', consulta.eventDateLabel],
            ['Teléfono', consulta.phone],
            ['Correo', consulta.email],
          ] as const
        ).map(([rotulo, valor]) => (
          <div className="flex flex-col gap-1" key={rotulo}>
            <dt className="text-[12px] text-ink-mute">{rotulo}</dt>
            <dd className="text-[14px] break-words text-ink">{valor ?? <span className="text-ink-mute">—</span>}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-2">
        <h3 className="text-[12px] text-ink-mute">Mensaje</h3>
        {consulta.message ? (
          <p className="rounded-[14px] bg-bg-top px-4 py-3.5 text-[14px] leading-[1.7] whitespace-pre-line text-ink">{consulta.message}</p>
        ) : (
          <p className="text-[13px] text-ink-mute">No dejó mensaje.</p>
        )}
        {consulta.note ? (
          <p className="text-[12.5px] text-ink-soft">
            <span className="text-ink-mute">Nota interna:</span> {consulta.note}
          </p>
        ) : null}
        {consulta.event ? (
          <Link className="w-fit text-[12.5px] text-gold-deep underline underline-offset-4" href={`/panel/eventos/${consulta.event.slug}/configuracion`}>
            Evento enlazado: {consulta.event.title}
          </Link>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 border-t border-line-panel pt-5">
        <h3 className="text-[13px] font-medium text-ink">Contestar</h3>
        <div className="flex flex-wrap gap-2">
          {whatsapp ? (
            <PanelButton external href={whatsapp} variant="primary">
              Escribir por WhatsApp
            </PanelButton>
          ) : null}
          {consulta.email ? (
            <PanelButton external href={`mailto:${consulta.email}`}>
              Enviar correo
            </PanelButton>
          ) : null}
          {!whatsapp && !consulta.email ? <p className="text-[13px] text-ink-mute">No dejó forma de contacto.</p> : null}
        </div>
      </section>

      {destinos.length > 0 ? (
        <form action={mover} className="flex flex-col gap-3 border-t border-line-panel pt-5">
          <input name="id" type="hidden" value={consulta.id} />
          <h3 className="text-[13px] font-medium text-ink">Mover a</h3>
          <label className="flex flex-col gap-1.5" htmlFor={`${id}-nota`}>
            <span className="text-[12px] text-ink-mute">{destinos.includes('lost') ? 'Nota (obligatoria si la marcas como perdida)' : 'Nota (opcional)'}</span>
            <textarea className={`${FIELD_CLASS} min-h-[70px] resize-y text-[13px]`} id={`${id}-nota`} name="note" />
          </label>
          {destinos.includes('won') && eventos.length > 0 ? (
            <label className="flex flex-col gap-1.5" htmlFor={`${id}-boda`}>
              <span className="text-[12px] text-ink-mute">Evento que salió de esta consulta (opcional)</span>
              <select className={`${FIELD_CLASS} text-[13px]`} defaultValue="" id={`${id}-boda`} name="eventId">
                <option value="">Ninguno</option>
                {eventos.map((evento) => (
                  <option key={evento.id} value={evento.id}>
                    {evento.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {destinos.map((destino) => (
              <PanelButton
                disabled={moviendo}
                key={destino}
                name="to"
                type="submit"
                value={destino}
                variant={destino === 'lost' ? 'danger' : destino === 'won' ? 'primary' : 'default'}
              >
                {ACCION[destino]}
              </PanelButton>
            ))}
          </div>
          <ActionFeedback state={estado} />
        </form>
      ) : (
        <p className="border-t border-line-panel pt-5 text-[13px] text-ink-mute">Ganada: es definitiva.</p>
      )}
    </article>
  )
}

/**
 * Una fila de la lista de la bandeja: quién, qué dijo (en una línea) y cuándo, con el estado.
 * Es un enlace a `?id=`: la consulta abierta vive en la dirección y sobrevive a la acción que
 * revalida y remonta.
 */
export function ConsultationRow({ consulta, href, abierta }: { consulta: ConsultationView; href: string; abierta: boolean }) {
  return (
    <li>
      <Link
        aria-current={abierta ? 'true' : undefined}
        className={`flex flex-col gap-1 border-b border-line-panel px-4 py-3.5 transition-colors ${
          abierta ? 'bg-bg-top shadow-[inset_3px_0_0_var(--color-ink)]' : 'hover:bg-bg-top/60'
        }`}
        href={href}
        scroll={false}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className={`truncate text-[14px] ${consulta.status === 'new' ? 'font-medium text-ink' : 'text-ink-soft'}`}>{consulta.name}</span>
          <span className="shrink-0 text-[11.5px] text-ink-mute">{consulta.shortDateLabel}</span>
        </span>
        <span className="truncate text-[12.5px] text-ink-mute">
          {[consulta.category, consulta.message].filter(Boolean).join(' · ') || 'Sin mensaje'}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <Pill tone={TONO[consulta.status]}>{ETIQUETA_ESTADO[consulta.status]}</Pill>
          {consulta.espera === null ? null : (
            // Con palabras y color: pasado el día, «sin contestar» en rojo.
            <span className={`text-[11.5px] ${consulta.espera.urgente ? 'text-danger' : 'text-ink-mute'}`}>
              Sin contestar · {consulta.espera.texto}
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}

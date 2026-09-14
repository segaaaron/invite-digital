'use client'

import Link from 'next/link'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, PanelAlert, PanelButton, Pill, type PillTone } from '@/shared/design/ui/panel/PanelKit'
import { moveConsultationAction, type InboxActionState } from '../actions'
import { destinosDesde, ETIQUETA_ESTADO, type EstadoConsulta } from '../domain/pipeline'
import { whatsAppToCustomer } from '../domain/whatsapp-link'

const INICIAL: InboxActionState = { status: 'idle' }

const TONO: Record<EstadoConsulta, PillTone> = { new: 'maybe', contacted: 'pending', won: 'ok', lost: 'no' }

/** El verbo del botón, no el nombre del estado: se pulsa para hacer algo. */
const ACCION: Record<EstadoConsulta, string> = {
  new: 'Nueva',
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
  readonly event: { readonly slug: string; readonly title: string } | null
}

/**
 * Una consulta de la web en la bandeja del admin.
 *
 * Arriba lo que hace falta para decidir sin abrir nada —quién, para qué, cuándo, qué dijo—
 * y abajo cómo contestar y a qué estado pasa. Cada tarjeta lleva **su propio estado** de
 * acción, igual que las filas de música: con uno compartido, el acierto de una se pintaría
 * en todas.
 */
export function ConsultationItem({
  consulta,
  eventos,
}: {
  consulta: ConsultationView
  /** Las bodas a las que se puede enlazar al ganarla. */
  eventos: readonly { id: string; title: string }[]
}) {
  const [estado, mover, moviendo] = useActionState(moveConsultationAction, INICIAL)
  const id = useId()
  const destinos = destinosDesde(consulta.status)

  const whatsapp = whatsAppToCustomer(
    consulta.phone,
    `Hola ${consulta.name.split(' ')[0] ?? ''}, te escribimos de InvitePremium por tu consulta en la web.`,
  )

  return (
    <li className="flex flex-col gap-4 border-b border-line-panel py-5 last:border-none min-[900px]:flex-row min-[900px]:gap-8">
      <div className="flex min-w-0 flex-1 gap-3.5">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-sage to-[var(--color-gold-light)] font-display text-[19px] text-white italic"
        >
          {consulta.name.slice(0, 1).toUpperCase()}
        </span>

        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-display text-[21px] leading-tight text-ink">{consulta.name}</span>
            <Pill tone={TONO[consulta.status]}>{ETIQUETA_ESTADO[consulta.status]}</Pill>
          </div>

          <p className="font-mono text-[10px] tracking-[0.18em] text-ink-mute uppercase">
            {[consulta.category, consulta.eventDateLabel ? `Evento ${consulta.eventDateLabel}` : null, consulta.receivedLabel]
              .filter(Boolean)
              .join(' · ')}
          </p>

          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-soft">
            {consulta.phone ? <span>{consulta.phone}</span> : null}
            {consulta.email ? (
              <a className="underline decoration-line-panel-strong underline-offset-2 hover:text-ink" href={`mailto:${consulta.email}`}>
                {consulta.email}
              </a>
            ) : null}
          </p>

          {consulta.message ? (
            <blockquote className="mt-1 border-l-2 border-gold/50 pl-3 text-[13px] leading-[1.65] text-ink-soft italic">
              «{consulta.message}»
            </blockquote>
          ) : null}

          {consulta.note ? (
            <p className="mt-1 text-[12px] text-ink-mute">
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase">Nota</span> · {consulta.note}
            </p>
          ) : null}

          {consulta.event ? (
            <Link className="mt-1 text-[12px] text-sage underline underline-offset-2" href={`/panel/eventos/${consulta.event.slug}`}>
              Boda: {consulta.event.title}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2.5 min-[900px]:w-[340px]">
        <div className="flex flex-wrap gap-2">
          {whatsapp ? (
            <PanelButton external href={whatsapp}>
              WhatsApp
            </PanelButton>
          ) : null}
          {consulta.email ? (
            <PanelButton external href={`mailto:${consulta.email}`}>
              Correo
            </PanelButton>
          ) : null}
        </div>

        {destinos.length > 0 ? (
          <form action={mover} className="flex flex-col gap-2.5">
            <input name="id" type="hidden" value={consulta.id} />
            <div className="flex flex-wrap gap-2">
              {destinos.map((destino) => (
                <PanelButton
                  key={destino}
                  disabled={moviendo}
                  name="to"
                  type="submit"
                  value={destino}
                  variant={destino === 'lost' ? 'danger' : destino === 'won' ? 'primary' : 'default'}
                >
                  {ACCION[destino]}
                </PanelButton>
              ))}
            </div>
            {/* Plegado: casi siempre se contacta sin escribir nada, y una caja de texto
                abierta en cada tarjeta convierte la bandeja en un formulario de doscientas
                filas. Los campos plegados **se envían igual**; se abre sola tras un error,
                que casi siempre es la nota que falta al perderla. */}
            <details className="group" open={estado.status === 'error'}>
              <summary className="cursor-pointer list-none font-mono text-[10px] tracking-[0.25em] text-ink-soft uppercase hover:text-ink">
                <span className="group-open:hidden">+ Nota{destinos.includes('won') && eventos.length > 0 ? ' · enlazar boda' : ''}</span>
                <span className="hidden group-open:inline">− Ocultar</span>
              </summary>
              <div className="mt-2.5 flex flex-col gap-2">
                <label className="sr-only" htmlFor={`${id}-nota`}>
                  Nota sobre {consulta.name}
                </label>
                <textarea
                  className={`${FIELD_CLASS} min-h-[60px] resize-y text-[13px]`}
                  id={`${id}-nota`}
                  name="note"
                  placeholder={destinos.includes('lost') ? 'Obligatoria si se pierde: por qué' : 'Nota'}
                />
                {destinos.includes('won') && eventos.length > 0 ? (
                  <>
                    <label className="sr-only" htmlFor={`${id}-boda`}>
                      Boda que salió de esta consulta
                    </label>
                    <select className={`${FIELD_CLASS} text-[13px]`} defaultValue="" id={`${id}-boda`} name="eventId">
                      <option value="">Al ganarla, enlazar boda (opcional)</option>
                      {eventos.map((evento) => (
                        <option key={evento.id} value={evento.id}>
                          {evento.title}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>
            </details>
          </form>
        ) : null}

        {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
        {estado.status === 'success' ? <PanelAlert tone="ok">{estado.message}</PanelAlert> : null}
      </div>
    </li>
  )
}

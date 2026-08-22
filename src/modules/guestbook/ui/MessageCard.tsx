'use client'

import { useState, useTransition } from 'react'
import { markReadAction, replyAction, toggleFeaturedAction } from '../actions'
import { createReply } from '../domain/message-note'
import type { GuestMessage } from '../domain/inbox'
import { isErr } from '@/shared/result'

type Props = {
  eventId: string
  eventSlug: string
  message: GuestMessage
}

const PILL =
  'rounded-[var(--radius-pill)] border border-line px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink disabled:opacity-40'

const PILL_ON =
  'rounded-[var(--radius-pill)] border border-gold-deep bg-gold-deep px-4 py-2 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised disabled:opacity-40'

/** Panel en español: aquí no se negocia idioma, a diferencia de la página del invitado. */
const cuando = (d: Date): string =>
  d.toLocaleString('es-BO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

/**
 * Una firma del libro. El borde dorado marca lo que está sin leer, **y además** lleva la
 * palabra «Sin leer»: quien no distingue el dorado del gris tiene que poder saberlo
 * igual, y un color solo no es información.
 */
export function MessageCard({ eventId, eventSlug, message }: Props) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const sinLeer = message.readAt === null
  const destacado = message.featuredAt !== null

  const correr = (accion: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null)
    empezar(async () => {
      const r = await accion()
      if (!r.ok) setError(r.message ?? 'No se pudo completar la operación.')
    })
  }

  const responder = () => {
    // La misma regla del dominio, aplicada antes de salir: el atelier ve el rechazo
    // mientras escribe en vez de esperar a que el servidor le diga lo que ya se sabía.
    const limpio = createReply(texto)
    if (isErr(limpio)) {
      setError(limpio.error.detail)
      return
    }

    correr(async () => {
      const r = await replyAction({ responseId: message.responseId, eventId, eventSlug, text: limpio.value })
      if (r.ok) setTexto('')
      return r
    })
  }

  return (
    <article
      className={`flex flex-col gap-3 rounded-card border bg-bg-raised p-5 ${sinLeer ? 'border-gold' : 'border-line'}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-[18px] font-light text-ink">{message.groupLabel}</h3>
        <div className="flex items-center gap-3">
          {sinLeer ? (
            <span className="rounded-[var(--radius-pill)] border border-gold px-3 py-1 font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep">
              Sin leer
            </span>
          ) : null}
          <time className="font-mono text-[10px] text-ink-mute" dateTime={message.writtenAt.toISOString()}>
            {cuando(message.writtenAt)}
          </time>
        </div>
      </header>

      <p className="text-[14px] leading-[1.7] text-ink">{message.body}</p>

      {message.reply === null ? null : (
        <div className="rounded-[14px] bg-bg-sunken px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Tu respuesta</p>
          <p className="text-[13px] leading-[1.6] text-ink-soft">{message.reply}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label
          className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute"
          htmlFor={`respuesta-${message.responseId}`}
        >
          {`Responder a ${message.groupLabel}`}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="min-w-[220px] flex-1 rounded-[var(--radius-pill)] border border-[var(--color-line)] bg-bg-top/80 px-4 py-2 text-[13px] text-ink outline-none transition-colors focus-visible:border-gold"
            id={`respuesta-${message.responseId}`}
            onChange={(e) => setTexto(e.target.value)}
            type="text"
            value={texto}
          />
          <button className={PILL} disabled={pendiente} onClick={responder} type="button">
            Responder
          </button>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2">
        {sinLeer ? (
          <button
            className={PILL}
            disabled={pendiente}
            onClick={() => correr(() => markReadAction({ responseId: message.responseId, eventId, eventSlug }))}
            type="button"
          >
            Marcar leído
          </button>
        ) : null}
        <button
          aria-pressed={destacado}
          className={destacado ? PILL_ON : PILL}
          disabled={pendiente}
          onClick={() => correr(() => toggleFeaturedAction({ responseId: message.responseId, eventId, eventSlug }))}
          type="button"
        >
          {destacado ? 'Quitar destacado' : 'Destacar'}
        </button>
      </footer>

      {error === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}

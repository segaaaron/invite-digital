'use client'

import { useState, useTransition } from 'react'
import { replyAction } from '@/app/_acciones/guestbook/actions'
import { avatarColor } from '@/shared/design/ui/avatar-color'
import { MessageIcon, QuoteIcon } from '@/shared/design/ui/icons'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { fecha } from '@/shared/format/fecha'
import { isErr } from '@/shared/result'
import { createReply } from '../domain/message-note'
import type { GuestMessage } from '../domain/inbox'

/**
 * El libro de firmas: los buenos deseos que dejaron los invitados al confirmar, como un muro de
 * tarjetas —el de los libros de firmas digitales de boda—, no como una bandeja de correo.
 *
 * Sin «leído» ni «destacado» (pedido por el usuario): un mensaje de un invitado se lee y basta.
 * Queda **agradecer**, porque el invitado ve la respuesta al volver a su invitación.
 */
export function LibroDeFirmas({ eventId, eventSlug, messages }: { eventId: string; eventSlug: string; messages: readonly GuestMessage[] }) {
  if (messages.length === 0) {
    return (
      <EmptyState
        description="Tus invitados pueden dejarte unas palabras al confirmar su asistencia. Aquí se van juntando, como un libro de firmas."
        icon={<MessageIcon />}
        title="Tu libro de firmas espera sus primeras palabras"
      />
    )
  }
  const ordenados = [...messages].sort((a, b) => b.writtenAt.getTime() - a.writtenAt.getTime())
  return (
    <div className="columns-1 gap-4.5 min-[760px]:columns-2 min-[1280px]:columns-3">
      {ordenados.map((m) => (
        <Firma eventId={eventId} eventSlug={eventSlug} key={m.responseId} message={m} />
      ))}
    </div>
  )
}

function Firma({ eventId, eventSlug, message }: { eventId: string; eventSlug: string; message: GuestMessage }) {
  const [abierta, setAbierta] = useState(false)
  const [texto, setTexto] = useState(message.reply ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()
  const firma = message.responderName ?? message.groupLabel

  const responder = () => {
    const limpio = createReply(texto)
    if (isErr(limpio)) {
      setError(limpio.error.detail)
      return
    }
    setError(null)
    empezar(async () => {
      const r = await replyAction({ responseId: message.responseId, eventId, eventSlug, text: limpio.value })
      if (!r.ok) setError(r.message)
      else setAbierta(false)
    })
  }

  return (
    <article className="relative mb-4.5 flex break-inside-avoid flex-col gap-4 rounded-[20px] border border-line-panel bg-linear-to-b from-white to-bg-top/60 p-6 shadow-card">
      <QuoteIcon aria-hidden className="size-7 text-gold/60" />
      <p className="m-0 font-display text-[21px] leading-[1.45] font-light text-ink italic">{message.body}</p>

      <footer className="flex items-center gap-3 border-t border-line-panel pt-4">
        <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br font-display text-[15px] text-white italic ${avatarColor(firma)}`}>
          {firma.trim().slice(0, 1).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13.5px] text-ink">{firma}</span>
          <span className="truncate text-[11.5px] text-ink-mute">
            {[message.responderName !== null && message.responderName !== message.groupLabel ? message.groupLabel : null, fecha(message.writtenAt)].filter(Boolean).join(' · ')}
          </span>
        </span>
      </footer>

      {message.reply !== null && !abierta ? (
        <div className="rounded-[14px] bg-bg-top px-4 py-3">
          <p className="m-0 text-[11px] text-ink-mute">Tu agradecimiento</p>
          <p className="m-0 mt-0.5 text-[13.5px] leading-[1.6] text-ink-soft">{message.reply}</p>
        </div>
      ) : null}

      {abierta ? (
        <div className="flex flex-col gap-2">
          <label className="text-[12px] text-ink-soft" htmlFor={`respuesta-${message.responseId}`}>
            {`Agradecer a ${firma}`}
          </label>
          <textarea
            className="min-h-[76px] rounded-[14px] border border-line-panel-strong bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus-visible:border-ink"
            id={`respuesta-${message.responseId}`}
            onChange={(e) => setTexto(e.target.value)}
            value={texto}
          />
          <p className="m-0 text-[11.5px] text-ink-mute">Lo verá al volver a abrir su invitación.</p>
          <div className="flex gap-2">
            <button
              className="cursor-pointer rounded-full bg-ink px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-white uppercase disabled:opacity-50"
              disabled={pendiente}
              onClick={responder}
              type="button"
            >
              {pendiente ? 'Guardando…' : 'Guardar'}
            </button>
            <button className="cursor-pointer rounded-full border border-line-panel-strong px-4 py-2 text-[12px] text-ink" onClick={() => setAbierta(false)} type="button">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button className="w-fit cursor-pointer text-[12.5px] text-ink-soft underline underline-offset-4 hover:text-ink" onClick={() => setAbierta(true)} type="button">
          {message.reply === null ? 'Agradecer' : 'Editar agradecimiento'}
        </button>
      )}

      {error === null ? null : (
        <p className="m-0 text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}

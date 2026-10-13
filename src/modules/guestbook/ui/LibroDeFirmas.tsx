'use client'

import { useState, useTransition } from 'react'
import { replyAction } from '@/app/_acciones/guestbook/actions'
import { MessageIcon } from '@/shared/design/ui/icons'
import { EmptyState } from '@/shared/design/ui/panel/estados'
import { PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { fecha, hace } from '@/shared/format/fecha'
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
export function LibroDeFirmas({ eventId, eventSlug, messages, vacioFiltrado = false }: { eventId: string; eventSlug: string; messages: readonly GuestMessage[]; vacioFiltrado?: boolean }) {
  if (messages.length === 0 && vacioFiltrado) {
    return <EmptyState compact description="Ya les agradeciste a todos los que firmaron." icon={<MessageIcon />} title="Nada por agradecer" />
  }
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
    <div className="columns-1 gap-4.5 min-[760px]:columns-2 min-[1100px]:columns-3">
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

  const ahora = new Date()
  const cuando = ahora.getTime() - message.writtenAt.getTime() < 7 * 86_400_000 ? hace(message.writtenAt, ahora) : fecha(message.writtenAt)
  return (
    <article className="relative mb-4.5 flex break-inside-avoid flex-col gap-3.5 rounded-[16px] border border-line-panel bg-tarjeta p-5">
      <p className="m-0 font-display text-[20px] leading-[1.4] font-medium text-ink italic before:content-['«'] after:content-['»']" data-cita>
        {message.body}
      </p>

      <footer className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13.5px]">
        <span className="font-medium text-ink">{firma}</span>
        <span className="text-ink-mute">{cuando}</span>
        {message.reply === null ? <Pill tone="vip">Nueva</Pill> : null}
      </footer>

      {message.reply !== null && !abierta ? (
        <div className="rounded-[12px] bg-pill-maybe px-4 py-3">
          <p className="m-0 text-[12px] text-ink-mute">Tu respuesta</p>
          <p className="m-0 mt-0.5 text-[14px] leading-[1.6] text-ink">{message.reply}</p>
        </div>
      ) : null}

      {abierta ? (
        <div className="flex flex-col gap-2">
          <label className="text-[13px] text-ink-soft" htmlFor={`respuesta-${message.responseId}`}>
            {`Agradecer a ${firma}`}
          </label>
          <textarea
            className="min-h-[76px] rounded-[12px] border border-line-panel-strong bg-bg-raised px-3.5 py-2.5 text-[14px] text-ink outline-none focus-visible:border-ink"
            id={`respuesta-${message.responseId}`}
            onChange={(e) => setTexto(e.target.value)}
            value={texto}
          />
          <p className="m-0 text-[12.5px] text-ink-mute">Lo verá al volver a abrir su invitación.</p>
          <div className="flex gap-2">
            <PanelButton disabled={pendiente} onClick={responder} size="sm" variant="primary">
              {pendiente ? 'Guardando…' : 'Guardar'}
            </PanelButton>
            <PanelButton onClick={() => setAbierta(false)} size="sm">
              Cancelar
            </PanelButton>
          </div>
        </div>
      ) : message.reply === null ? (
        <span>
          <PanelButton aria-label={`Agradecer a ${firma.split(' ')[0]}`} onClick={() => setAbierta(true)} size="sm">
            Agradecer
          </PanelButton>
        </span>
      ) : (
        <button className="w-fit cursor-pointer text-[13px] text-ink-mute underline-offset-2 hover:text-ink hover:underline" onClick={() => setAbierta(true)} type="button">
          Editar respuesta
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

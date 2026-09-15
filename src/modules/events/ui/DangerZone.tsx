'use client'

import { useActionState, useId, useState } from 'react'
import { deleteEventAction, type DeleteEventState } from '@/app/_acciones/events/actions'

/**
 * La zona de riesgo de la maqueta.
 *
 * Borrar un evento se lleva por delante invitados, mesas, regalos, mensajes y visitas, y
 * no hay papelera. Por eso el botón no aparece hasta que quien lo pide escribe el
 * identificador exacto del evento — y el servidor lo vuelve a comprobar, porque este
 * formulario es cortesía y la acción es un extremo público.
 */
export function DangerZone({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [state, action, pending] = useActionState<DeleteEventState, FormData>(deleteEventAction, { status: 'idle' })
  const [escrito, setEscrito] = useState('')
  const campoId = useId()

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-5">
      <input name="eventId" type="hidden" value={eventId} />

      <p className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-danger uppercase">Zona de riesgo</p>
      <p className="text-[13px] leading-[1.7] text-ink-soft">
        Eliminar el evento borra para siempre sus invitados, mesas, regalos, mensajes y visitas. No hay deshacer.
      </p>

      <label className="flex flex-col gap-2" htmlFor={campoId}>
        <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
          Escribe «{eventSlug}» para confirmar
        </span>
        <input
          autoComplete="off"
          className="rounded-[14px] border border-line bg-bg-top/80 px-4 py-3 text-[14px] text-ink"
          id={campoId}
          name="confirmation"
          onChange={(e) => setEscrito(e.target.value)}
          value={escrito}
        />
      </label>

      {state.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      <button
        className="w-fit rounded-full border border-danger px-4 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-danger uppercase disabled:opacity-40"
        disabled={pending || escrito.trim() !== eventSlug}
        type="submit" aria-busy={(pending) || undefined}>
        {pending ? 'Eliminando…' : 'Eliminar evento'}
      </button>
    </form>
  )
}

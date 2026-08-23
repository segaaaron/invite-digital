'use client'

import { useActionState, useId, useState } from 'react'
import { setEventPrivacyAction, type PrivacyState } from '../actions'

/**
 * Privacidad del evento, como en la maqueta: pública con el enlace, o protegida con
 * contraseña.
 *
 * El campo de contraseña solo aparece con la segunda opción elegida, y nunca se rellena
 * con la que ya hay: en la base solo está su hash, así que no habría qué mostrar.
 */
export function PrivacyForm({
  eventId,
  eventSlug,
  hasPassword,
}: {
  eventId: string
  eventSlug: string
  hasPassword: boolean
}) {
  const [state, action, pending] = useActionState<PrivacyState, FormData>(setEventPrivacyAction, { status: 'idle' })
  const [modo, setModo] = useState<'public' | 'password'>(hasPassword ? 'password' : 'public')
  const campoId = useId()

  return (
    <form action={action} className="flex flex-col gap-4">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="eventSlug" type="hidden" value={eventSlug} />

      <p className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">Privacidad</p>

      <label className="flex items-center gap-2.5 text-[13px] text-ink">
        <input checked={modo === 'public'} name="privacy" onChange={() => setModo('public')} type="radio" value="public" />
        Pública — cualquiera con el enlace
      </label>

      <label className="flex items-center gap-2.5 text-[13px] text-ink">
        <input
          checked={modo === 'password'}
          name="privacy"
          onChange={() => setModo('password')}
          type="radio"
          value="password"
        />
        Protegida con contraseña
      </label>

      {modo === 'password' ? (
        <label className="flex flex-col gap-2" htmlFor={campoId}>
          <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase">
            {hasPassword ? 'Nueva contraseña de acceso' : 'Contraseña de acceso'}
          </span>
          <input
            autoComplete="new-password"
            className="rounded-[14px] border border-line bg-bg-top/80 px-4 py-3 text-[14px] text-ink"
            id={campoId}
            name="password"
            required
            type="text"
          />
          <span className="text-[11px] text-ink-mute">
            Cambiarla cierra la invitación a quien ya la había abierto: tendrá que escribir la nueva.
          </span>
        </label>
      ) : null}

      {state.status === 'error' ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === 'success' ? (
        <p className="text-[13px] text-sage" role="status">
          Privacidad guardada.
        </p>
      ) : null}

      <button
        className="w-fit rounded-full border border-line px-4 py-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink uppercase disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? 'Guardando…' : 'Guardar privacidad'}
      </button>
    </form>
  )
}

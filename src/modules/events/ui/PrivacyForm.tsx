'use client'

import { useActionState, useId, useState } from 'react'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { setEventPrivacyAction, type PrivacyState } from '@/app/_acciones/events/actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'

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
  contrasenaIncluida = true,
}: {
  eventId: string
  eventSlug: string
  hasPassword: boolean
  /** Si el plan trae la contraseña. Sin ella la opción se ve apagada y dice por qué: se puede subir de plan. */
  contrasenaIncluida?: boolean
}) {
  const [state, action, pending] = useActionState<PrivacyState, FormData>(setEventPrivacyAction, { status: 'idle' })
  const [modo, setModo] = useState<'public' | 'password'>(hasPassword ? 'password' : 'public')
  const campoId = useId()

  return (
    <form action={action} className="flex flex-col gap-4">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="eventSlug" type="hidden" value={eventSlug} />

      <p className={LABEL_CLASS}>Privacidad</p>

      <label className="flex items-center gap-2.5 text-[13px] text-ink">
        <input checked={modo === 'public'} className="accent-ink" name="privacy" onChange={() => setModo('public')} type="radio" value="public" />
        Pública — cualquiera con el enlace
      </label>

      <label className="flex items-center gap-2.5 text-[13px] text-ink">
        <input
          checked={modo === 'password'}
          className="accent-ink"
          disabled={!contrasenaIncluida && !hasPassword}
          name="privacy"
          onChange={() => setModo('password')}
          type="radio"
          value="password"
        />
        Protegida con contraseña
        {!contrasenaIncluida && !hasPassword ? <span className="text-[12px] text-ink-mute">· tu plan no la incluye</span> : null}
      </label>

      {modo === 'password' ? (
        <label className="flex flex-col gap-2" htmlFor={campoId}>
          <span className={LABEL_CLASS}>{hasPassword ? 'Nueva contraseña de acceso' : 'Contraseña de acceso'}</span>
          <input
            autoComplete="new-password"
            className={FIELD_CLASS}
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
        <p className="text-[13px] text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === 'success' ? (
        <p className="text-[13px] text-sage" role="status">
          Privacidad guardada.
        </p>
      ) : null}

      <SubmitButton className="w-fit" variant="primary" pending={pending} pendingLabel={'Guardando…'}>{'Guardar privacidad'}</SubmitButton>
    </form>
  )
}

'use client'

import { useActionState, useId, useState } from 'react'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { setEventPrivacyAction, type PrivacyState } from '@/app/_acciones/events/actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { CampoContrasena } from '@/shared/design/ui/panel/CampoContrasena'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

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
  const t = useT()
  const [state, action, pending] = useActionState<PrivacyState, FormData>(sinCaerse(setEventPrivacyAction), { status: 'idle' })
  const [modo, setModo] = useState<'public' | 'password'>(hasPassword ? 'password' : 'public')
  const campoId = useId()

  return (
    <form action={action} className="flex flex-col gap-4">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="eventSlug" type="hidden" value={eventSlug} />

      <p className={LABEL_CLASS}>{t('Privacidad', 'Privacy')}</p>

      <label className="flex items-center gap-2.5 text-[13px] text-ink max-[859px]:min-h-11">
        <input checked={modo === 'public'} className="accent-ink" name="privacy" onChange={() => setModo('public')} type="radio" value="public" />
        {t('Pública — cualquiera con el enlace', 'Public — anyone with the link')}
      </label>

      <label className="flex items-center gap-2.5 text-[13px] text-ink max-[859px]:min-h-11">
        <input
          checked={modo === 'password'}
          className="accent-ink"
          disabled={!contrasenaIncluida && !hasPassword}
          name="privacy"
          onChange={() => setModo('password')}
          type="radio"
          value="password"
        />
        {t('Protegida con contraseña', 'Password protected')}
        {!contrasenaIncluida && !hasPassword ? <span className="text-[12px] text-ink-mute">· {t('tu plan no la incluye', 'your plan doesn’t include it')}</span> : null}
      </label>

      {modo === 'password' ? (
        <label className="flex flex-col gap-2" htmlFor={campoId}>
          <span className={LABEL_CLASS}>{hasPassword ? t('Nueva contraseña de acceso', 'New access password') : t('Contraseña de acceso', 'Access password')}</span>
          <CampoContrasena
            autoComplete="new-password"
            className={FIELD_CLASS}
            id={campoId}
            name="password"
            required
          />
          <span className="text-[12px] text-ink-mute">
            {t('Cambiarla cierra la invitación a quien ya la había abierto: tendrá que escribir la nueva.', 'Changing it closes the invitation for anyone who had opened it: they’ll have to type the new one.')}
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
          {t('Privacidad guardada.', 'Privacy saved.')}
        </p>
      ) : null}

      <SubmitButton className="w-fit" variant="primary" pending={pending} pendingLabel={t('Guardando…', 'Saving…')}>{t('Guardar privacidad', 'Save privacy')}</SubmitButton>
    </form>
  )
}

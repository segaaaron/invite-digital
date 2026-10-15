'use client'

import { useActionState } from 'react'
import { unlockEventAction, type UnlockState } from '@/app/_acciones/events/actions'
import { CampoContrasena } from '@/shared/design/ui/panel/CampoContrasena'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * La puerta de un evento protegido con contraseña.
 *
 * No dice nada del evento —ni el título, ni la fecha, ni quién invita—: quien no tiene la
 * contraseña no debe averiguar de qué boda se trata por el simple hecho de tener el
 * enlace. Y el error es siempre el mismo, sin distinguir «token raro» de «contraseña
 * incorrecta».
 */
export function EventPasswordGate({ token }: { token: string }) {
  const t = useT()
  const [state, action, pending] = useActionState<UnlockState, FormData>(sinCaerse(unlockEventAction), { status: 'idle' })

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <p className="font-mono text-[10px] tracking-[0.35em] text-ink-mute uppercase">{t('Invitación privada', 'Private invitation')}</p>
      <h1 className="font-display text-[28px] font-light text-ink">{t('Escribe la contraseña', 'Enter the password')}</h1>
      <p className="max-w-[42ch] text-center text-[13px] leading-[1.7] text-ink-soft">
        {t('Quien te invitó te la dio junto al enlace.', 'Whoever invited you gave it to you with the link.')}
      </p>

      <form action={action} className="flex w-full max-w-[320px] flex-col gap-3">
        <input name="token" type="hidden" value={token} />
        <label className="flex flex-col gap-2">
          <span className="sr-only">{t('Contraseña', 'Password')}</span>
          <CampoContrasena
            autoComplete="off"
            className="rounded-[14px] border border-line bg-bg-raised px-4 py-3 text-[15px] text-ink"
            name="password"
            required
          />
        </label>

        {state.status === 'error' ? (
          <p className="text-[13px] text-danger" role="alert">
            {state.message}
          </p>
        ) : null}

        <button
          className="rounded-full bg-gold px-5 py-3 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-white uppercase disabled:opacity-60"
          disabled={pending}
          type="submit" aria-busy={(pending) || undefined}>
          {pending ? t('Comprobando…', 'Checking…') : t('Entrar', 'Enter')}
        </button>
      </form>
    </main>
  )
}

'use client'

import { useActionState, useId, useState } from 'react'
import Link from 'next/link'
import { confirmPasswordResetAction, requestPasswordResetAction, type ResetState } from '@/app/_acciones/identity/actions'
import { CampoContrasena } from '@/shared/design/ui/panel/CampoContrasena'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: ResetState = { status: 'idle', message: '' }

const FIELD_CLASS =
  'w-full rounded-[10px] border border-line-panel-strong bg-bg-raised px-4 py-3.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-mute/70 focus-visible:border-gold focus-visible:shadow-[0_0_0_3px_rgb(var(--color-gold-rgb)/0.18)]'

const LABEL_CLASS = 'text-[14px] font-medium text-ink'

const BOTON =
  'mt-1 min-h-13 cursor-pointer rounded-[10px] bg-shell-deep px-7 text-[16px] font-medium text-shell-ink transition-colors hover:bg-sage disabled:cursor-not-allowed disabled:opacity-60'

/**
 * Recuperar la contraseña con un código de un solo uso.
 *
 * Dos pasos en una pantalla: se pide el código y, cuando llega al correo, se teclea junto
 * a la contraseña nueva. El correo se conserva entre los dos pasos en el propio
 * componente para no hacérselo escribir dos veces.
 *
 * **El primer paso responde lo mismo exista o no la cuenta.** Decir «ese correo no está
 * registrado» convertiría esta pantalla en una forma de averiguar quién es cliente del
 * atelier.
 */
export function RecoverForm() {
  const t = useT()
  const [correo, setCorreo] = useState('')
  const [pedido, pedirCodigo, pidiendo] = useActionState<ResetState, FormData>(sinCaerse(requestPasswordResetAction), INICIAL)
  const [cambio, confirmar, confirmando] = useActionState<ResetState, FormData>(sinCaerse(confirmPasswordResetAction), INICIAL)
  const id = useId()

  const yaSePidio = pedido.status === 'sent'

  if (cambio.status === 'done') {
    return (
      <div className="flex flex-col gap-4" role="status">
        <p className="text-[15px] text-ink">{cambio.message}</p>
        <Link className={`${BOTON} w-fit text-center`} href="/panel/entrar">
          {t('Entrar', 'Sign in')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <form action={pedirCodigo} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
            {t('Tu correo', 'Your email')}
          </label>
          <input
            autoComplete="username"
            className={FIELD_CLASS}
            id={`${id}-correo`}
            name="email"
            onChange={(e) => setCorreo(e.target.value)}
            placeholder={t('tucorreo@dominio.bo', 'you@example.com')}
            required
            type="email"
            value={correo}
          />
        </div>

        <button className={BOTON} disabled={pidiendo} type="submit" aria-busy={(pidiendo) || undefined}>
          {pidiendo ? t('Enviando…', 'Sending…') : yaSePidio ? t('Enviar otro código', 'Send another code') : t('Enviarme un código', 'Send me a code')}
        </button>

        {pedido.status !== 'idle' ? (
          <p
            aria-live="polite"
            className={`text-[13px] ${pedido.status === 'error' ? 'text-danger' : 'text-ink-soft'}`}
            role={pedido.status === 'error' ? 'alert' : 'status'}
          >
            {pedido.message}
          </p>
        ) : null}
      </form>

      {yaSePidio ? (
        <form action={confirmar} className="flex flex-col gap-4 border-t border-line pt-6">
          {/* El correo viaja otra vez: la acción es pública y no hay sesión de la que
              sacarlo. */}
          <input name="email" type="hidden" value={correo} />

          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-codigo`}>
              {t('Código del correo', 'Code from the email')}
            </label>
            <input
              autoComplete="one-time-code"
              className={FIELD_CLASS}
              id={`${id}-codigo`}
              inputMode="numeric"
              name="code"
              placeholder="000000"
              required
              type="text"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-nueva`}>
              {t('Contraseña nueva', 'New password')}
            </label>
            <CampoContrasena
              autoComplete="new-password"
              className={FIELD_CLASS}
              id={`${id}-nueva`}
              minLength={12}
              name="password"
              required
            />
          </div>

          <p className="text-[11px] leading-[1.7] text-ink-mute">
            {t('Al menos 12 caracteres. El código caduca en diez minutos y sirve una sola vez.', 'At least 12 characters. The code expires in ten minutes and works only once.')}
          </p>

          <button className={BOTON} disabled={confirmando} type="submit" aria-busy={(confirmando) || undefined}>
            {confirmando ? t('Cambiando…', 'Changing…') : t('Cambiar la contraseña', 'Change the password')}
          </button>

          {cambio.status === 'error' ? (
            <p className="text-[13px] text-danger" role="alert">
              {cambio.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}

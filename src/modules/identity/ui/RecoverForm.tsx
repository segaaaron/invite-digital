'use client'

import { useActionState, useId, useState } from 'react'
import Link from 'next/link'
import { confirmPasswordResetAction, requestPasswordResetAction, type ResetState } from '@/app/_acciones/identity/actions'

const INICIAL: ResetState = { status: 'idle', message: '' }

const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-raised px-4 py-3.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-mute/70 focus-visible:border-gold focus-visible:shadow-[0_0_0_3px_rgb(var(--color-gold-rgb)/0.18)]'

const LABEL_CLASS = 'font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase'

const BOTON =
  'mt-1 cursor-pointer rounded-[var(--radius-pill)] bg-linear-to-b from-gold to-gold-deep px-7 py-3.5 font-mono text-[10px] tracking-[0.3em] text-bg-raised uppercase shadow-[0_6px_18px_rgb(var(--color-gold-rgb)/0.28)] transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60'

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
  const [correo, setCorreo] = useState('')
  const [pedido, pedirCodigo, pidiendo] = useActionState<ResetState, FormData>(requestPasswordResetAction, INICIAL)
  const [cambio, confirmar, confirmando] = useActionState<ResetState, FormData>(confirmPasswordResetAction, INICIAL)
  const id = useId()

  const yaSePidio = pedido.status === 'sent'

  if (cambio.status === 'done') {
    return (
      <div className="flex flex-col gap-4" role="status">
        <p className="text-[15px] text-ink">{cambio.message}</p>
        <Link className={`${BOTON} w-fit text-center`} href="/panel/entrar">
          Entrar
        </Link>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <form action={pedirCodigo} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
            Tu correo
          </label>
          <input
            autoComplete="username"
            className={FIELD_CLASS}
            id={`${id}-correo`}
            name="email"
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tucorreo@dominio.bo"
            required
            type="email"
            value={correo}
          />
        </div>

        <button className={BOTON} disabled={pidiendo} type="submit" aria-busy={(pidiendo) || undefined}>
          {pidiendo ? 'Enviando…' : yaSePidio ? 'Enviar otro código' : 'Enviarme un código'}
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
              Código del correo
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
              Contraseña nueva
            </label>
            <input
              autoComplete="new-password"
              className={FIELD_CLASS}
              id={`${id}-nueva`}
              minLength={12}
              name="password"
              required
              type="password"
            />
          </div>

          <p className="text-[11px] leading-[1.7] text-ink-mute">
            Al menos 12 caracteres. El código caduca en diez minutos y sirve una sola vez.
          </p>

          <button className={BOTON} disabled={confirmando} type="submit" aria-busy={(confirmando) || undefined}>
            {confirmando ? 'Cambiando…' : 'Cambiar la contraseña'}
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

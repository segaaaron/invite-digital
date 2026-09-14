'use client'

import Link from 'next/link'
import { useActionState, useId } from 'react'
import { signInAction, type SignInActionState } from '../actions'

const INITIAL: SignInActionState = { status: 'idle', message: '' }

const MESSAGES = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  too_many_attempts: 'Demasiados intentos. Espera un minuto.',
  storage_failure: 'No pudimos comprobar tus datos. Inténtalo en un momento.',
} as const

/**
 * El campo lleva el foco en un anillo dorado, no en el contorno del navegador: el azul
 * del sistema es lo único de esta pantalla que no es de la marca. Sigue siendo visible
 * con el teclado, que es lo que el contorno estaba haciendo.
 */
const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-raised px-4 py-3.5 text-[15px] text-ink shadow-[inset_0_1px_2px_rgb(43_39_35/0.04)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-mute/70 focus-visible:border-gold focus-visible:shadow-[0_0_0_3px_rgb(var(--color-gold-rgb)/0.18)]'

const LABEL_CLASS = 'font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase'

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInAction, INITIAL)
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  const error = state.status === 'error' && state.message !== '' ? MESSAGES[state.message] : null

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={emailId}>
          Correo
        </label>
        <input
          autoComplete="username"
          autoFocus
          // `aria-invalid` en los dos campos y no en uno: el error no dice cuál de los
          // dos falla, a propósito, y señalar solo el correo sería inventarse el motivo.
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error !== null}
          className={FIELD_CLASS}
          id={emailId}
          name="email"
          placeholder="atelier@tudominio.bo"
          required
          type="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={passwordId}>
          Contraseña
        </label>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error !== null}
          autoComplete="current-password"
          className={FIELD_CLASS}
          id={passwordId}
          name="password"
          placeholder="••••••••"
          required
          type="password"
        />
      </div>

      {error ? (
        <p
          className="rounded-[12px] border border-danger/30 bg-danger/8 px-3.5 py-2.5 text-[13px] text-danger-deep"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        className="mt-1 cursor-pointer rounded-[var(--radius-pill)] bg-linear-to-b from-gold to-gold-deep px-7 py-3.5 font-mono text-[10px] tracking-[0.3em] text-bg-raised uppercase shadow-[0_6px_18px_rgb(var(--color-gold-rgb)/0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgb(var(--color-gold-rgb)/0.34)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Entrando…' : 'Entrar'}
      </button>

      {/* Sigue sin haber «crear cuenta», y eso no es un descuido: las altas las hace el
          admin. Lo que sí hay ya es recuperación — antes no, porque no había proveedor de
          correo, y este texto decía justamente eso. */}
      <p className="text-[11px] leading-[1.7] text-ink-mute">
        <Link className="underline underline-offset-4 hover:text-ink" href="/panel/recuperar">
          ¿Olvidaste tu contraseña?
        </Link>
        <br />
        Las cuentas las da de alta el administrador.
      </p>
    </form>
  )
}

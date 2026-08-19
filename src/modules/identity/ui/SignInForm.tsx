'use client'

import { useActionState, useId } from 'react'
import { signInAction, type SignInActionState } from '../actions'

const INITIAL: SignInActionState = { status: 'idle', message: '' }

const MESSAGES = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  too_many_attempts: 'Demasiados intentos. Espera un minuto.',
  storage_failure: 'No pudimos comprobar tus datos. Inténtalo en un momento.',
} as const

const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'

const LABEL_CLASS = 'flex flex-col gap-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute'

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInAction, INITIAL)
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  const error = state.status === 'error' && state.message !== '' ? MESSAGES[state.message] : null

  return (
    <form action={formAction} className="flex w-full max-w-[380px] flex-col gap-5">
      <label className={LABEL_CLASS} htmlFor={emailId}>
        Correo
        <input autoComplete="username" className={FIELD_CLASS} id={emailId} name="email" required type="email" />
      </label>

      <label className={LABEL_CLASS} htmlFor={passwordId}>
        Contraseña
        <input autoComplete="current-password" className={FIELD_CLASS} id={passwordId} name="password" required type="password" />
      </label>

      {error ? (
        <p className="text-[13px] text-gold-deep" id={errorId} role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised transition-transform duration-300 hover:-translate-y-0.5 hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}

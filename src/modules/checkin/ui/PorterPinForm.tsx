'use client'

import { useActionState, useId } from 'react'
import { enterAsPorterAction, type PinState } from '@/app/_acciones/checkin/porter-actions'

const INICIAL: PinState = { status: 'idle' }

/**
 * La entrada del portero: su PIN de seis dígitos y nada más. No enseña el evento: quien
 * tenga el enlace sin el PIN no debe saber de qué fiesta es, como la puerta de contraseña.
 */
export function PorterPinForm({ token }: { token: string }) {
  const [estado, entrar, entrando] = useActionState(enterAsPorterAction, INICIAL)
  const id = useId()

  return (
    <form action={entrar} className="flex w-full max-w-[340px] flex-col gap-4">
      <input name="token" type="hidden" value={token} />
      <label className="font-mono text-[10px] tracking-[0.3em] text-shell-ink/70 uppercase" htmlFor={`${id}-pin`}>
        PIN de 6 dígitos
      </label>
      <input
        aria-describedby={estado.status === 'error' ? `${id}-error` : undefined}
        autoComplete="one-time-code"
        autoFocus
        className="w-full rounded-[14px] border border-shell-ink/25 bg-transparent px-4 py-4 text-center font-mono text-[28px] tracking-[0.4em] text-shell-ink outline-none focus-visible:border-gold"
        id={`${id}-pin`}
        inputMode="numeric"
        maxLength={6}
        minLength={6}
        name="pin"
        pattern="\d{6}"
        required
      />
      {estado.status === 'error' ? (
        <p className="text-center text-[13px] text-gold-light" id={`${id}-error`} role="alert">
          {estado.message}
        </p>
      ) : null}
      <button
        className="w-full cursor-pointer rounded-[var(--radius-pill)] bg-gold px-4 py-3.5 font-mono text-[11px] tracking-[0.3em] text-shell-deep uppercase disabled:opacity-50"
        disabled={entrando}
        type="submit" aria-busy={(entrando) || undefined}>
        {entrando ? 'Entrando…' : 'Entrar a la puerta'}
      </button>
    </form>
  )
}

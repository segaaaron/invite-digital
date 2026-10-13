'use client'

import Link from 'next/link'
import { useActionState, useId, useState } from 'react'
import { EyeIcon, EyeOffIcon } from '@/shared/design/ui/icons'
import { signInAction, type SignInActionState } from '@/app/_acciones/identity/actions'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

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
  'w-full rounded-[10px] border border-line-panel-strong bg-bg-raised px-4 py-3.5 text-[15px] text-ink shadow-[inset_0_1px_2px_rgb(43_39_35/0.04)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-mute/70 focus-visible:border-gold focus-visible:shadow-[0_0_0_3px_rgb(var(--color-gold-rgb)/0.18)]'

const LABEL_CLASS = 'text-[14px] font-medium text-ink'

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(sinCaerse(signInAction, { status: 'error', message: 'storage_failure' }), INITIAL)
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  // Arranca oculta: enseñarla por defecto la dejaría a la vista de quien pasa por detrás.
  const [verContrasena, setVerContrasena] = useState(false)
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
          placeholder="nombre@correo.com"
          required
          type="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={passwordId}>
          Contraseña
        </label>
        {/*
          El ojo va **dentro** del campo, no al lado: fuera empuja el ancho del input y en
          un teléfono deja la contraseña en un cajón más estrecho que el correo.

          `type="button"` y no el que hereda: dentro de un formulario, un botón sin tipo
          es `submit`, así que enseñar la contraseña habría intentado entrar.
        */}
        <div className="relative">
          <input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error !== null}
            autoComplete="current-password"
            className={`${FIELD_CLASS} pr-12`}
            id={passwordId}
            name="password"
            placeholder="••••••••"
            required
            type={verContrasena ? 'text' : 'password'}
          />
          <button
            // **Sin la palabra «Contraseña» dentro, y no es capricho.** Con
            // `aria-label="Ver la contraseña"`, un `getByLabel('Contraseña')` casaba con el
            // campo **y** con este botón, y Playwright en modo estricto se niega a elegir:
            // el inicio de sesión del setup murió ahí y con él 224 pruebas que ni
            // arrancaron. Es la misma lección que los iconos de la fila de invitados.
            aria-label={verContrasena ? 'Ocultar' : 'Mostrar'}
            aria-pressed={verContrasena}
            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-[10px] p-2 text-ink-mute transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            onClick={() => setVerContrasena((antes) => !antes)}
            type="button"
          >
            {verContrasena ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
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

      <div className="flex items-center justify-between gap-3 text-[14px]">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
          <input className="size-[18px] accent-[var(--color-shell-deep)]" defaultChecked name="recordarme" type="checkbox" />
          Recordarme<span className="max-[559px]:sr-only"> en este aparato</span>
        </label>
        <Link className="text-gold-deep underline underline-offset-4 hover:text-ink" href="/panel/recuperar">
          <span aria-hidden className="min-[560px]:hidden">¿La olvidaste?</span>
          <span className="max-[559px]:sr-only">¿Olvidaste tu contraseña?</span>
        </Link>
      </div>

      <button
        className="mt-1 min-h-13 cursor-pointer rounded-[10px] bg-shell-deep px-7 text-[16px] font-medium text-shell-ink transition-colors hover:bg-sage disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit" aria-busy={(isPending) || undefined}>
        {isPending ? 'Entrando…' : 'Entrar'}
      </button>

      {/* Sigue sin haber «crear cuenta», y eso no es un descuido: las altas las hace el
          admin. Lo que sí hay ya es recuperación — antes no, porque no había proveedor de
          correo, y este texto decía justamente eso. */}
      <p className="text-center text-[14px] text-ink-mute">
        ¿Aún no tienes acceso?{' '}
        {/* Una ruta que redirige a wa.me: se abre fuera, no se navega dentro de la app. */}
        <a className="text-gold-deep underline underline-offset-4 hover:text-ink" href="/contacto/whatsapp" rel="noopener noreferrer" target="_blank">
          Escríbenos por WhatsApp
        </a>
      </p>
    </form>
  )
}

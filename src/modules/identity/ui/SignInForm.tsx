'use client'

import Link from 'next/link'
import { useActionState, useId, useRef, useState } from 'react'
import { EyeIcon, EyeOffIcon } from '@/shared/design/ui/icons'
import { signInAction, type SignInActionState } from '@/app/_acciones/identity/actions'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { T } from '@/shared/i18n/t'
import { useT } from '@/shared/i18n/idioma-navegador'
import { RUTAS } from '@/shared/rutas/panel'

const INITIAL: SignInActionState = { status: 'idle', message: '' }

const mensajes = (t: T) =>
  ({
    invalid_credentials: t('Correo o contraseña incorrectos.', 'Wrong email or password.'),
    too_many_attempts: t('Demasiados intentos. Espera un minuto.', 'Too many attempts. Wait a minute.'),
    storage_failure: t('No pudimos comprobar tus datos. Inténtalo en un momento.', 'We could not check your details. Try again in a moment.'),
  }) as const

/**
 * El campo lleva el foco en un anillo dorado, no en el contorno del navegador: el azul
 * del sistema es lo único de esta pantalla que no es de la marca. Sigue siendo visible
 * con el teclado, que es lo que el contorno estaba haciendo.
 */
const FIELD_CLASS =
  'w-full rounded-[10px] border border-line-panel-strong bg-bg-raised px-4 py-3.5 text-[15px] text-ink shadow-[inset_0_1px_2px_rgb(43_39_35/0.04)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-mute/70 focus-visible:border-gold focus-visible:shadow-[0_0_0_3px_rgb(var(--color-gold-rgb)/0.18)]'

const LABEL_CLASS = 'text-[14px] font-medium text-ink'

export function SignInForm() {
  const t = useT()
  const [state, formAction, isPending] = useActionState(sinCaerse(signInAction, { status: 'error', message: 'storage_failure' }), INITIAL)
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  // Arranca oculta: enseñarla por defecto la dejaría a la vista de quien pasa por detrás.
  const [verContrasena, setVerContrasena] = useState(false)
  /**
   * «Entrar» se apaga cuando lo escrito no sirve: correo a medias o contraseña vacía.
   *
   * **Solo después de escribir.** Apagarlo también de entrada dejó al usuario encerrado (27 oct):
   * el gestor de contraseñas rellenó los dos campos sin disparar ningún evento, el botón siguió
   * gris y no había forma de entrar con los datos correctos delante. Mientras nadie toque nada el
   * botón está encendido; si al pulsarlo falta algo, el aviso de cada campo lo dice.
   *
   * Se mira con `:invalid` y **no** con `checkValidity()`: ese dispara el aviso de cada campo, y
   * al cargar la pantalla habría pintado los dos errores en rojo sin que nadie escribiera nada.
   */
  /**
   * El velo tiene un suelo de 320 ms. Cuando el servidor contesta en 150 —en local siempre— el
   * velo aparecía y desaparecía en el mismo parpadeo: se veía un fogonazo y nadie sabía si había
   * pasado algo. No retiene nada: la respuesta ya llegó, lo único que espera es el ojo.
   */
  const [veloMinimo, setVeloMinimo] = useState(false)
  const esperando = isPending || veloMinimo
  const formulario = useRef<HTMLFormElement>(null)
  const [escrito, setEscrito] = useState(false)
  const [completo, setCompleto] = useState(true)
  const revisar = () => {
    setEscrito(true)
    setCompleto(formulario.current?.querySelector(':invalid') == null)
  }
  const error = state.status === 'error' && state.message !== '' ? mensajes(t)[state.message] : null

  return (
    <>
    {/*
      Mientras el servidor contesta, la pantalla entera espera: un velo sobre todo, el sello y
      «Entrando…». Antes solo lo decía el botón y los campos seguían tocables, así que se podía
      escribir encima de un envío en curso o volver a pulsar. `aria-busy` y `role="status"` lo
      cuentan también a quien no lo ve.
    */}
    {esperando ? (
      <div aria-busy className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-bg/85 backdrop-blur-[3px]" role="status">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" className="size-14 animate-latido" src="/site/marca/sello-la-144-59259035.avif" />
        <p className="flex items-center gap-2.5 text-[15px] text-ink">
          <span aria-hidden className="size-2 animate-latido rounded-full bg-gold" />
          {t('Entrando…', 'Signing in…')}
        </p>
      </div>
    ) : null}
    <form
      action={formAction}
      className="flex w-full flex-col gap-5"
      onChange={revisar}
      onInput={revisar}
      onSubmit={() => {
        setVeloMinimo(true)
        window.setTimeout(() => setVeloMinimo(false), 320)
      }}
      ref={formulario}
    >
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={emailId}>
          {t('Correo', 'Email')}
        </label>
        {/*
          El correo se comprueba **al salir del campo**, no al enviar: `checkValidity()` dispara el
          mismo `invalid` que escucha `ValidacionDeFormularios`, que es quien pinta el mensaje bajo
          el campo y lo marca. Si está vacío no dice nada todavía —aún lo está escribiendo—.

          Y lleva patrón propio porque `type="email"` da por bueno `ana@correo`: pide un dominio
          con punto y al menos dos letras detrás. El `title` es lo que se lee si falla.
        */}
        <input
          autoComplete="username"
          autoFocus
          // `aria-invalid` en los dos campos y no en uno: el error no dice cuál de los
          // dos falla, a propósito, y señalar solo el correo sería inventarse el motivo.
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error !== null}
          className={FIELD_CLASS}
          id={emailId}
          inputMode="email"
          name="email"
          onBlur={(evento) => {
            if (evento.currentTarget.value.trim() !== '') evento.currentTarget.checkValidity()
          }}
          pattern="[^@\s]+@[^@\s]+\.[A-Za-z]{2,}"
          placeholder={t('nombre@correo.com', 'name@email.com')}
          required
          title={t('Escribe un correo válido, como nombre@correo.com.', 'Enter a valid email, like name@email.com.')}
          type="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={passwordId}>
          {t('Contraseña', 'Password')}
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
            aria-label={verContrasena ? t('Ocultar', 'Hide') : t('Mostrar', 'Show')}
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

      {/*
        Las dos cosas en una línea, y cada una entera: antes la fila repartía el ancho a partes
        iguales y «en este aparato» y «¿Olvidaste tu contraseña?» caían en dos columnas de dos
        renglones cada una. Si de verdad no caben, la casilla se queda arriba y el enlace baja.
      */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[14px]">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap">
          <input className="size-[18px] accent-[var(--color-shell-deep)]" defaultChecked name="recordarme" type="checkbox" />
          {t('Recordarme', 'Remember me')}<span className="max-[559px]:sr-only">{t(' en este aparato', ' on this device')}</span>
        </label>
        <Link className="whitespace-nowrap text-gold-deep underline underline-offset-4 hover:text-ink" href={RUTAS.recuperar}>
          <span aria-hidden className="min-[560px]:hidden">{t('¿La olvidaste?', 'Forgot it?')}</span>
          <span className="max-[559px]:sr-only">{t('¿Olvidaste tu contraseña?', 'Forgot your password?')}</span>
        </Link>
      </div>

      {/*
        Mientras comprueba, el botón lo dice: el punto que late del panel —el mismo de
        `SubmitButton`, que con movimiento reducido se queda quieto— y «Entrando…». Entrar pasa por
        el servidor y en una conexión lenta la espera se hacía a ciegas: parecía que no se envió.
      */}
      <button
        aria-busy={esperando || undefined}
        className="mt-1 flex min-h-13 cursor-pointer items-center justify-center gap-2.5 rounded-[10px] bg-shell-deep px-7 text-[16px] font-medium text-shell-ink transition-colors hover:bg-sage disabled:cursor-wait disabled:opacity-60"
        disabled={esperando || (escrito && !completo)}
        type="submit"
      >
        {esperando ? <span aria-hidden className="size-2 animate-latido rounded-full bg-current" /> : null}
        {esperando ? t('Entrando…', 'Signing in…') : t('Entrar', 'Sign in')}
      </button>

      {/* Sigue sin haber «crear cuenta», y eso no es un descuido: las altas las hace el
          admin. Lo que sí hay ya es recuperación — antes no, porque no había proveedor de
          correo, y este texto decía justamente eso. */}
      <p className="text-center text-[14px] text-ink-mute">
        {t('¿Aún no tienes acceso?', 'No access yet?')}{' '}
        {/* Una ruta que redirige a wa.me: se abre fuera, no se navega dentro de la app. */}
        <a className="text-gold-deep underline underline-offset-4 hover:text-ink" href="/contacto/whatsapp" rel="noopener noreferrer" target="_blank">
          {t('Escríbenos por WhatsApp', 'Message us on WhatsApp')}
        </a>
      </p>
    </form>
    </>
  )
}

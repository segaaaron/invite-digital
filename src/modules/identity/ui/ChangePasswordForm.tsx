'use client'

import Link from 'next/link'
import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { changePasswordAction, type ChangePasswordState } from '@/app/_acciones/identity/actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { CampoContrasena } from '@/shared/design/ui/panel/CampoContrasena'

const INICIAL: ChangePasswordState = { status: 'idle', message: '' }

/**
 * El cambio de la propia contraseña.
 *
 * Pide la actual a propósito: una sesión abierta en un ordenador prestado no puede bastar
 * para quedarse con la cuenta. Y al guardar se cierran todas las sesiones, así que la
 * pantalla avisa antes de que alguien pulse.
 */
export function ChangePasswordForm({ inicial = false }: { inicial?: boolean }) {
  const [estado, accion, pendiente] = useActionState<ChangePasswordState, FormData>(changePasswordAction, INICIAL)
  const id = useId()

  return (
    <form action={accion} className="flex max-w-[420px] flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-actual`}>
          {inicial ? 'La contraseña que te dieron' : 'Contraseña actual'}
        </label>
        <CampoContrasena
          autoComplete="current-password"
          className={FIELD_CLASS}
          id={`${id}-actual`}
          name="current"
          required
        />
        {inicial ? null : (
          <Link className="self-start text-[12px] text-ink-soft underline underline-offset-2 hover:text-ink" href="/panel/recuperar">
            ¿Olvidaste tu contraseña?
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-nueva`}>
          {inicial ? 'Tu contraseña nueva' : 'Contraseña nueva'}
        </label>
        <CampoContrasena
          autoComplete="new-password"
          className={FIELD_CLASS}
          id={`${id}-nueva`}
          aria-describedby={`${id}-requisito`}
          minLength={12}
          name="next"
          required
        />
        <p className="text-[12px] leading-[1.5] text-ink-mute" id={`${id}-requisito`}>
          Al menos 12 caracteres.
        </p>
      </div>

      <p className="rounded-[12px] bg-bg-top px-3.5 py-2.5 text-[12px] leading-[1.6] text-ink-soft">
        {inicial
          ? 'Al guardarla entras de nuevo con ella: es la única que valdrá a partir de ahora.'
          : 'Al guardar se cierran todas tus sesiones, también esta: vuelves a entrar con la nueva.'}
      </p>

      <SubmitButton className="w-full" variant="primary" pending={pendiente} pendingLabel={'Guardando…'}>
        {inicial ? 'Guardar y entrar' : 'Cambiar la contraseña'}
      </SubmitButton>

      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}
    </form>
  )
}

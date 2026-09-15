'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { changePasswordAction, type ChangePasswordState } from '@/app/_acciones/identity/actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: ChangePasswordState = { status: 'idle', message: '' }

/**
 * El cambio de la propia contraseña.
 *
 * Pide la actual a propósito: una sesión abierta en un ordenador prestado no puede bastar
 * para quedarse con la cuenta. Y al guardar se cierran todas las sesiones, así que la
 * pantalla avisa antes de que alguien pulse.
 */
export function ChangePasswordForm() {
  const [estado, accion, pendiente] = useActionState<ChangePasswordState, FormData>(changePasswordAction, INICIAL)
  const id = useId()

  return (
    <form action={accion} className="flex max-w-[420px] flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-actual`}>
          Contraseña actual
        </label>
        <input
          autoComplete="current-password"
          className={FIELD_CLASS}
          id={`${id}-actual`}
          name="current"
          required
          type="password"
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
          name="next"
          required
          type="password"
        />
      </div>

      <p className="text-[11px] leading-[1.7] text-ink-mute">
        Al menos 12 caracteres. Al guardar se cierran todas las sesiones —también esta—, así que tendrás que volver a
        entrar con la nueva.
      </p>

      <SubmitButton variant="primary" pending={pendiente} pendingLabel={'Guardando…'}>{'Cambiar la contraseña'}</SubmitButton>

      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}
    </form>
  )
}

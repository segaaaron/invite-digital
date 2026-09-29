'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { changePasswordAction, type ChangePasswordState } from '@/app/_acciones/identity/actions'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { CampoContrasena } from '@/shared/design/ui/panel/CampoContrasena'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: ChangePasswordState = { status: 'idle', message: '' }

/**
 * Elegir la suya tras entrar con la provisional. **Un solo campo**: la provisional no se vuelve
 * a pedir (acaba de escribirla para entrar) y el ojo de `CampoContrasena` sustituye a repetirla.
 * Al guardar entra directo al panel.
 */
export function ChangePasswordForm() {
  const [estado, accion, pendiente] = useActionState<ChangePasswordState, FormData>(sinCaerse(changePasswordAction), INICIAL)
  const id = useId()

  return (
    <form action={accion} className="flex max-w-[420px] flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-nueva`}>
          Tu contraseña nueva
        </label>
        <CampoContrasena
          autoComplete="new-password"
          autoFocus
          className={FIELD_CLASS}
          id={`${id}-nueva`}
          aria-describedby={`${id}-requisito`}
          minLength={12}
          name="next"
          required
        />
        <p className="text-[12px] leading-[1.5] text-ink-mute" id={`${id}-requisito`}>
          Al menos 12 caracteres. Toca el ojo para ver lo que escribes.
        </p>
      </div>

      <SubmitButton className="w-full" variant="primary" pending={pendiente} pendingLabel={'Guardando…'}>
        Guardar y entrar
      </SubmitButton>

      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}
    </form>
  )
}

'use client'

import Link from 'next/link'
import { useActionState, useId, useState } from 'react'
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
export function ChangePasswordForm({ inicial = false }: { inicial?: boolean }) {
  const [estado, accion, pendiente] = useActionState<ChangePasswordState, FormData>(changePasswordAction, INICIAL)
  const id = useId()
  // Mostrar lo escrito evita el error más común: una letra de más en una clave que no se ve.
  const [visible, setVisible] = useState(false)
  const tipo = visible ? 'text' : 'password'

  return (
    <form action={accion} className="flex max-w-[420px] flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-actual`}>
          {inicial ? 'La contraseña que te dieron' : 'Contraseña actual'}
        </label>
        <input
          autoComplete="current-password"
          className={FIELD_CLASS}
          id={`${id}-actual`}
          name="current"
          required
          type={tipo}
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
        <input
          autoComplete="new-password"
          className={FIELD_CLASS}
          id={`${id}-nueva`}
          aria-describedby={`${id}-requisito`}
          minLength={12}
          name="next"
          required
          type={tipo}
        />
        <p className="text-[12px] leading-[1.5] text-ink-mute" id={`${id}-requisito`}>
          Al menos 12 caracteres.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
        <input checked={visible} className="accent-ink" onChange={(e) => setVisible(e.target.checked)} type="checkbox" />
        Mostrar las contraseñas
      </label>

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

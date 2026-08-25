'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { createUserAction, deleteUserAction, setUserRoleAction, type AdminActionState } from '../actions'

const INICIAL: AdminActionState = { status: 'idle' }

export type UserView = {
  readonly id: string
  readonly email: string
  readonly role: 'admin' | 'atelier'
  readonly eventos: number
  readonly esUnoMismo: boolean
}

/**
 * El alta de usuario.
 *
 * **La contraseña inicial se enseña una sola vez**, aquí, y la escribe el admin: no hay
 * registro público ni recuperación por correo —no hay proveedor de correo—, así que
 * esta pantalla es la única puerta junto a `pnpm user:create`.
 */
export function NewUserForm() {
  const [estado, accion, pendiente] = useActionState<AdminActionState, FormData>(createUserAction, INICIAL)
  const id = useId()

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="grid gap-4 min-[560px]:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
            Correo
          </label>
          <input className={FIELD_CLASS} id={`${id}-correo`} name="email" required type="email" />
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-clave`}>
            Contraseña inicial
          </label>
          <input
            autoComplete="new-password"
            className={FIELD_CLASS}
            id={`${id}-clave`}
            minLength={12}
            name="password"
            required
            type="text"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-rol`}>
          Rol
        </label>
        <select className={FIELD_CLASS} defaultValue="atelier" id={`${id}-rol`} name="role">
          <option value="atelier">Atelier — solo sus eventos</option>
          <option value="admin">Administrador — todo el sistema</option>
        </select>
      </div>

      <p className="text-[11px] leading-[1.7] text-ink-mute">
        La contraseña se enseña aquí y no se vuelve a mostrar: en la base solo queda su hash. Cópiala antes de
        enviarla.
      </p>

      {estado.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}
      {estado.status === 'success' && estado.message !== undefined ? (
        <p className="text-[13px] text-sage" role="status">
          {estado.message}
        </p>
      ) : null}

      <PanelButton className="w-fit" disabled={pendiente} type="submit" variant="primary">
        {pendiente ? 'Creando…' : 'Crear usuario'}
      </PanelButton>
    </form>
  )
}

/** Una fila de usuario con sus dos acciones. Cada una en su formulario, con su estado. */
export function UserRow({ user }: { user: UserView }) {
  const [rol, cambiarRol, cambiando] = useActionState<AdminActionState, FormData>(setUserRoleAction, INICIAL)
  const [borrado, borrar, borrando] = useActionState<AdminActionState, FormData>(deleteUserAction, INICIAL)
  const error = rol.status === 'error' ? rol.message : borrado.status === 'error' ? borrado.message : null

  return (
    <li className="flex flex-col gap-2.5 border-b border-line-panel py-3.5 last:border-none">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] text-ink">{user.email}</span>
          <span className="mt-1 block text-[11px] text-ink-mute">
            {user.eventos} evento{user.eventos === 1 ? '' : 's'}
            {user.esUnoMismo ? ' · eres tú' : ''}
          </span>
        </span>

        <Pill tone={user.role === 'admin' ? 'ok' : 'pending'}>{user.role === 'admin' ? 'Administrador' : 'Atelier'}</Pill>

        {/* Cambiar el rol y borrar son dos formularios distintos: uno solo con dos
            emisores obligaría a leer el `decision` para saber qué se pidió. */}
        <form action={cambiarRol}>
          <input name="userId" type="hidden" value={user.id} />
          <input name="role" type="hidden" value={user.role === 'admin' ? 'atelier' : 'admin'} />
          <PanelButton disabled={cambiando || user.esUnoMismo} type="submit">
            {user.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
          </PanelButton>
        </form>

        <form action={borrar}>
          <input name="userId" type="hidden" value={user.id} />
          <PanelButton disabled={borrando || user.esUnoMismo || user.eventos > 0} type="submit" variant="danger">
            Borrar
          </PanelButton>
        </form>
      </div>

      {error === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}

      {user.eventos > 0 ? (
        <p className="text-[11px] text-ink-mute">
          No se puede borrar mientras gestione eventos: reasígnalos desde «Eventos» o bórralos.
        </p>
      ) : null}
    </li>
  )
}

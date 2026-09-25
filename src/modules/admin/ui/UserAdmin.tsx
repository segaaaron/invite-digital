'use client'

import { useActionState, useId } from 'react'
import { botonClases, FIELD_CLASS, LABEL_CLASS, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import type { Role } from '@/modules/identity'
import { type AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { createUserAction, deleteUserAction, setUserRoleAction } from '@/app/_acciones/admin/usuarios-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { CampoContrasena } from '@/shared/design/ui/panel/CampoContrasena'

const INICIAL: AdminActionState = { status: 'idle' }

export type UserView = {
  readonly id: string
  readonly email: string
  readonly role: Role
  readonly eventos: number
  readonly esUnoMismo: boolean
  /** Ya formateada en la página. */
  readonly alta: string
}

const ROL: Record<Role, { etiqueta: string; tono: 'ok' | 'maybe' | 'pending' | 'no'; que: string }> = {
  admin: { etiqueta: 'Administrador', tono: 'ok', que: 'Todo el sistema' },
  atelier: { etiqueta: 'Atelier', tono: 'pending', que: 'Lleva sus eventos' },
  cliente: { etiqueta: 'Cliente', tono: 'maybe', que: 'Su evento' },
  puerta: { etiqueta: 'Puerta', tono: 'no', que: 'Check-in de un evento' },
}

/**
 * El alta de usuario, dentro del modal que abre «+ Agregar usuario».
 *
 * **La contraseña inicial la escribe el admin** y le llega al usuario por correo; la primera
 * vez que entra, el panel le obliga a elegir una suya. El plan no se elige aquí: es de cada
 * evento, no de la cuenta.
 */
export function NewUserForm() {
  const [estado, accion, pendiente] = useActionState<AdminActionState, FormData>(createUserAction, INICIAL)
  const id = useId()
  // Tras un error vuelve lo enviado: React vacía el formulario al acabar la acción.
  const enviado = estado.status === 'error' ? estado.valores : undefined

  return (
    // `key` remonta el formulario tras un error: un `<select>` no toma un `defaultValue` nuevo al volver a pintar.
    <form key={enviado ? JSON.stringify(enviado) : 'alta'} action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
          Correo
        </label>
        <input autoComplete="off" className={FIELD_CLASS} defaultValue={enviado?.email ?? ''} id={`${id}-correo`} name="email" placeholder="nombre@correo.com" required type="email" />
      </div>

      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-clave`}>
          Contraseña inicial
        </label>
        <CampoContrasena
          aria-describedby={`${id}-clave-ayuda`}
          autoComplete="new-password"
          className={FIELD_CLASS}
          id={`${id}-clave`}
          minLength={12}
          name="password"
          required
        />
        <p className="text-[12px] leading-[1.5] text-ink-mute" id={`${id}-clave-ayuda`}>
          Mínimo 12 caracteres. Le llega por correo y la cambia al entrar por primera vez.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${LABEL_CLASS} mb-2`}>Rol</legend>
        {(['cliente', 'atelier', 'admin'] as const).map((rol) => (
          <label
            className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-line-panel-strong bg-white px-3.5 py-3 has-checked:border-ink has-checked:bg-bg-top"
            key={rol}
          >
            <input className="mt-1 accent-ink" defaultChecked={(enviado?.role || 'cliente') === rol} name="role" type="radio" value={rol} />
            <span className="flex flex-col">
              <span className="text-[13.5px] text-ink">{ROL[rol].etiqueta}</span>
              <span className="text-[12px] text-ink-mute">
                {rol === 'cliente'
                  ? 'Entra solo al evento al que se le dé acceso desde Todos los eventos.'
                  : rol === 'atelier'
                    ? 'Crea y lleva sus propios eventos.'
                    : 'Acceso completo a la administración.'}
              </span>
            </span>
          </label>
        ))}
        {/* El personal de puerta se da de alta desde el propio evento: sin evento no puede hacer nada. */}
      </fieldset>

      <ActionFeedback state={estado} />

      <SubmitButton className="w-full" pending={pendiente} pendingLabel="Creando…" variant="primary">
        Crear usuario
      </SubmitButton>
    </form>
  )
}

/**
 * Una fila de la lista de usuarios, al estilo de las listas de miembros de un equipo: quién,
 * qué rol tiene, qué lleva y sus acciones a la derecha.
 *
 * Se oculta lo que no se tiene por permiso —tus propias acciones, «Hacer admin» a un cliente—
 * y se deshabilita, explicando cómo habilitarlo, lo que está bloqueado por una condición que
 * puede cambiar: «Borrar» mientras el usuario lleve eventos. Borrar se confirma diciendo qué se
 * pierde.
 */
export function UserRow({ user }: { user: UserView }) {
  const [rol, cambiarRol, cambiando] = useActionState<AdminActionState, FormData>(setUserRoleAction, INICIAL)
  const [borrado, borrar] = useActionState<AdminActionState, FormData>(deleteUserAction, INICIAL)
  const id = useId()
  const error = [rol, borrado].find((e) => e.status === 'error')
  const puedeSerAdmin = user.role === 'admin' || user.role === 'atelier'

  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line-panel py-4 last:border-none">
      <div className="flex min-w-[240px] flex-1 items-center gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-bg-sunken font-display text-[16px] text-ink-soft uppercase">
          {user.email.slice(0, 1)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2 truncate text-[14px] text-ink">
            {user.email}
            {user.esUnoMismo ? <span className="rounded-full bg-bg-sunken px-2 py-0.5 text-[10.5px] text-ink-soft">Tú</span> : null}
          </span>
          <span className="text-[12px] text-ink-mute">Alta {user.alta}</span>
          {error && error.status === 'error' ? (
            <span className="mt-1 text-[12px] text-danger" role="alert">
              {error.message}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex w-[180px] flex-col gap-1">
        <Pill tone={ROL[user.role].tono}>{ROL[user.role].etiqueta}</Pill>
        <span className="text-[12px] text-ink-mute">{ROL[user.role].que}</span>
      </div>

      <div className="w-[110px] text-[13px] text-ink-soft [font-variant-numeric:lining-nums]">
        {user.eventos === 0 ? <span className="text-ink-mute">Sin eventos</span> : `${user.eventos} evento${user.eventos === 1 ? '' : 's'}`}
      </div>

      <div className="ml-auto flex flex-col items-end gap-1.5">
        {user.esUnoMismo ? null : (
          <span className="flex gap-2">
            {puedeSerAdmin ? (
              <form action={cambiarRol}>
                <input name="userId" type="hidden" value={user.id} />
                <input name="role" type="hidden" value={user.role === 'admin' ? 'atelier' : 'admin'} />
                <PanelButton disabled={cambiando} type="submit">
                  {user.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                </PanelButton>
              </form>
            ) : null}
            <ConfirmAction
              action={borrar}
              confirmLabel="Borrar usuario"
              describedBy={user.eventos > 0 ? `${id}-borrar` : undefined}
              description={
                <>
                  Se borra la cuenta de <strong className="font-normal text-ink">{user.email}</strong> y deja de poder entrar. Sus accesos a eventos
                  se quitan. No se puede deshacer.
                </>
              }
              disabled={user.eventos > 0}
              title="Borrar usuario"
              tone="danger"
              trigger="Borrar"
              triggerClassName={botonClases('danger')}
            >
              <input name="userId" type="hidden" value={user.id} />
            </ConfirmAction>
          </span>
        )}
        {!user.esUnoMismo && user.eventos > 0 ? (
          <span className="max-w-[260px] text-right text-[11.5px] leading-[1.4] text-ink-mute" id={`${id}-borrar`}>
            Para borrarlo, reasigna o borra antes sus eventos.
          </span>
        ) : null}
      </div>
    </li>
  )
}

'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, Pill } from '@/shared/design/ui/panel/PanelKit'
import { MenuDeAcciones, opcionDeMenu } from '@/shared/design/ui/panel/lista'
import { plural } from '@/shared/format/plural'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import type { Role } from '@/modules/identity'
import { type AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { createUserAction, deleteUserAction, setUserRoleAction } from '@/app/_acciones/admin/usuarios-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: AdminActionState = { status: 'idle' }

export type UserView = {
  readonly id: string
  readonly email: string
  readonly role: Role
  readonly eventos: number
  readonly esUnoMismo: boolean
  /** Ya formateada en la página. */
  readonly alta: string
  readonly nombre: string | null
  /** «hace 3 h», ya formateado; `null` si nunca entró. */
  readonly ultimoAcceso: string | null
}

/** Las columnas del equipo, las mismas en su encabezado. */
export const COLUMNAS_DE_EQUIPO = 'min-[860px]:grid-cols-[minmax(0,1.6fr)_150px_110px_130px_40px]'

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
  const [estado, accion, pendiente] = useActionState<AdminActionState, FormData>(sinCaerse(createUserAction), INICIAL)
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

      <p className="rounded-[12px] bg-bg-sunken/60 px-4 py-3 text-[12.5px] leading-[1.5] text-ink-soft">
        Le llega su acceso por correo con una contraseña provisional que se genera sola; la cambia al entrar por primera vez.
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${LABEL_CLASS} mb-2`}>Rol</legend>
        {(['atelier', 'admin'] as const).map((rol) => (
          <label
            className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-line-panel-strong bg-white px-3.5 py-3 has-checked:border-ink has-checked:bg-bg-top"
            key={rol}
          >
            <input className="mt-1 accent-ink" defaultChecked={(enviado?.role || 'atelier') === rol} name="role" type="radio" value={rol} />
            <span className="flex flex-col">
              <span className="text-[13.5px] text-ink">{ROL[rol].etiqueta}</span>
              <span className="text-[12px] text-ink-mute">
                {rol === 'atelier' ? 'Crea y lleva sus propios eventos.' : 'Acceso completo a la administración.'}
              </span>
            </span>
          </label>
        ))}
        {/* El personal de puerta se da de alta desde el propio evento, y el cliente nace con su evento. */}
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
  const [rol, cambiarRol, cambiando] = useActionState<AdminActionState, FormData>(sinCaerse(setUserRoleAction), INICIAL)
  const [borrado, borrar] = useActionState<AdminActionState, FormData>(sinCaerse(deleteUserAction), INICIAL)
  const id = useId()
  const error = [rol, borrado].find((e) => e.status === 'error')
  const puedeSerAdmin = user.role === 'admin' || user.role === 'atelier'

  return (
    <li className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line-panel px-1 py-3.5 last:border-none ${COLUMNAS_DE_EQUIPO}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-bg-sunken font-display text-[16px] text-ink-soft uppercase">
          {(user.nombre ?? user.email).slice(0, 1)}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-2 text-[14px] text-ink">
            <span className="truncate">{user.nombre ?? user.email}</span>
            {user.esUnoMismo ? <span className="shrink-0 rounded-full bg-bg-sunken px-2 py-0.5 text-[10.5px] text-ink-soft">Tú</span> : null}
          </span>
          <span className="truncate text-[12px] text-ink-mute">{user.nombre === null ? `Alta ${user.alta}` : user.email}</span>
          {error && error.status === 'error' ? (
            <span className="mt-1 text-[12px] text-danger" role="alert">
              {error.message}
            </span>
          ) : null}
        </div>
      </div>

      <div className="max-[859px]:col-start-2 max-[859px]:row-start-1 max-[859px]:justify-self-end">
        <Pill tone={ROL[user.role].tono}>{ROL[user.role].etiqueta}</Pill>
      </div>

      <div className="text-[13px] text-ink-soft [font-variant-numeric:lining-nums] max-[859px]:hidden">
        {user.eventos === 0 ? <span className="text-ink-mute">—</span> : plural(user.eventos, 'evento', 'eventos')}
      </div>

      <div className="text-[12px] text-ink-mute max-[859px]:hidden">{user.ultimoAcceso ?? 'Nunca entró'}</div>

      <div className="justify-self-end max-[859px]:col-start-2">
        {user.esUnoMismo ? null : (
          <MenuDeAcciones etiqueta={`Más acciones de ${user.email}`}>
            {puedeSerAdmin ? (
              <form action={cambiarRol}>
                <input name="userId" type="hidden" value={user.id} />
                <input name="role" type="hidden" value={user.role === 'admin' ? 'atelier' : 'admin'} />
                <button className={opcionDeMenu()} disabled={cambiando} type="submit">
                  {user.role === 'admin' ? 'Quitar el rol de administrador' : 'Hacer administrador'}
                </button>
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
              trigger="Borrar la cuenta"
              triggerClassName={opcionDeMenu(true)}
            >
              <input name="userId" type="hidden" value={user.id} />
            </ConfirmAction>
            {user.eventos > 0 ? (
              <p className="px-3 pb-2 text-[11.5px] leading-[1.4] text-ink-mute" id={`${id}-borrar`}>
                Para borrarla, reasigna o borra antes sus eventos.
              </p>
            ) : null}
          </MenuDeAcciones>
        )}
      </div>
    </li>
  )
}

/** Borrar la cuenta de un cliente, desde su ficha en Clientes: el único sitio donde vive. */
export function BorrarCuentaDeCliente({ userId, email }: { userId: string; email: string }) {
  const [estado, borrar] = useActionState<AdminActionState, FormData>(sinCaerse(deleteUserAction), INICIAL)
  return (
    <div className="flex flex-col gap-1.5">
      <ConfirmAction
        action={borrar}
        confirmLabel="Borrar la cuenta"
        description={
          <>
            <strong className="font-normal text-ink">{email}</strong> deja de poder entrar al panel y pierde el acceso a sus eventos. Los eventos no se
            borran. No se puede deshacer.
          </>
        }
        title="Borrar la cuenta del cliente"
        tone="danger"
        trigger="Borrar su cuenta"
        triggerClassName="w-fit text-[12.5px] text-danger-deep underline underline-offset-4 hover:text-danger"
      >
        <input name="userId" type="hidden" value={userId} />
      </ConfirmAction>
      {estado.status === 'error' ? (
        <p className="text-[12px] text-danger" role="alert">
          {estado.message}
        </p>
      ) : null}
    </div>
  )
}

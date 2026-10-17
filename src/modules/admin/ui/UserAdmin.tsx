'use client'

import { useActionState, useId } from 'react'
import { COLUMNAS_DE_EQUIPO } from './columnas-de-equipo'
import { FIELD_CLASS, Iniciales, LABEL_CLASS, Pill } from '@/shared/design/ui/panel/PanelKit'
import { MenuDeAcciones, opcionDeMenu } from '@/shared/design/ui/panel/lista'
import { plural } from '@/shared/format/plural'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import type { Role } from '@/modules/identity'
import type { AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { createUserAction, deleteUserAction, setUserRoleAction } from '@/app/_acciones/admin/usuarios-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { T } from '@/shared/i18n/t'
import { useT } from '@/shared/i18n/idioma-navegador'

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


const rolDe = (t: T): Record<Role, { etiqueta: string; tono: 'ok' | 'maybe' | 'pending' | 'no'; que: string }> => ({
  admin: { etiqueta: t('Administrador', 'Administrator'), tono: 'ok', que: t('Todo el sistema', 'The whole system') },
  atelier: { etiqueta: t('Atelier', 'Atelier'), tono: 'pending', que: t('Lleva sus eventos', 'Runs their events') },
  cliente: { etiqueta: t('Cliente', 'Client'), tono: 'maybe', que: t('Su evento', 'Their event') },
  puerta: { etiqueta: t('Puerta', 'Door'), tono: 'no', que: t('Check-in de un evento', 'An event’s check-in') },
})

/**
 * El alta de usuario, dentro del modal que abre «+ Agregar usuario».
 *
 * **La contraseña inicial la escribe el admin** y le llega al usuario por correo; la primera
 * vez que entra, el panel le obliga a elegir una suya. El plan no se elige aquí: es de cada
 * evento, no de la cuenta.
 */
export function NewUserForm() {
  const t = useT()
  const [estado, accion, pendiente] = useActionState<AdminActionState, FormData>(sinCaerse(createUserAction), INICIAL)
  const id = useId()
  // Tras un error vuelve lo enviado: React vacía el formulario al acabar la acción.
  const enviado = estado.status === 'error' ? estado.valores : undefined

  return (
    // `key` remonta el formulario tras un error: un `<select>` no toma un `defaultValue` nuevo al volver a pintar.
    <form key={enviado ? JSON.stringify(enviado) : 'alta'} action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
          {t('Correo', 'Email')}
        </label>
        <input autoComplete="off" className={FIELD_CLASS} defaultValue={enviado?.email ?? ''} id={`${id}-correo`} name="email" placeholder={t('nombre@correo.com', 'name@email.com')} required type="email" />
      </div>

      <p className="rounded-[12px] bg-bg-sunken/60 px-4 py-3 text-[12.5px] leading-[1.5] text-ink-soft">
        {t('Le llega su acceso por correo con una contraseña provisional que se genera sola; la cambia al entrar por primera vez.', 'Their access arrives by email with an auto-generated temporary password; they change it the first time they sign in.')}
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${LABEL_CLASS} mb-2`}>{t('Rol', 'Role')}</legend>
        {(['atelier', 'admin'] as const).map((rol) => (
          <label
            className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-line-panel-strong bg-white px-3.5 py-3 has-checked:border-ink has-checked:bg-bg-top"
            key={rol}
          >
            <input className="mt-1 accent-ink" defaultChecked={(enviado?.role || 'atelier') === rol} name="role" type="radio" value={rol} />
            <span className="flex flex-col">
              <span className="text-[13.5px] text-ink">{rolDe(t)[rol].etiqueta}</span>
              <span className="text-[12px] text-ink-mute">
                {rol === 'atelier' ? t('Crea y lleva sus propios eventos.', 'Creates and runs their own events.') : t('Acceso completo a la administración.', 'Full access to the administration.')}
              </span>
            </span>
          </label>
        ))}
        {/* El personal de puerta se da de alta desde el propio evento, y el cliente nace con su evento. */}
      </fieldset>

      <ActionFeedback state={estado} />

      <SubmitButton className="w-full" pending={pendiente} pendingLabel={t('Creando…', 'Creating…')} variant="primary">
        {t('Crear usuario', 'Create user')}
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
  const t = useT()
  const [rol, cambiarRol, cambiando] = useActionState<AdminActionState, FormData>(sinCaerse(setUserRoleAction), INICIAL)
  const [borrado, borrar] = useActionState<AdminActionState, FormData>(sinCaerse(deleteUserAction), INICIAL)
  const id = useId()
  const error = [rol, borrado].find((e) => e.status === 'error')
  const puedeSerAdmin = user.role === 'admin' || user.role === 'atelier'

  return (
    <li className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line-panel px-1 py-3.5 last:border-none ${COLUMNAS_DE_EQUIPO}`}>
      <div className="flex min-w-0 items-center gap-3">
        {/* Las mismas iniciales que el resto del panel (en mayúscula y con sus dos letras). */}
        <Iniciales chico nombre={user.nombre ?? user.email} />
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-2 text-[14px] text-ink">
            <span className="truncate">{user.nombre ?? user.email}</span>
            {user.esUnoMismo ? <span className="shrink-0 rounded-full bg-bg-sunken px-2 py-0.5 text-[12px] text-ink-soft">{t('Tú', 'You')}</span> : null}
          </span>
          <span className="truncate text-[12px] text-ink-mute">{user.nombre === null ? t(`Alta ${user.alta}`, `Added ${user.alta}`) : user.email}</span>
          {error && error.status === 'error' ? (
            <span className="mt-1 text-[12px] text-danger" role="alert">
              {error.message}
            </span>
          ) : null}
        </div>
      </div>

      <div className="max-[859px]:col-start-2 max-[859px]:row-start-1 max-[859px]:justify-self-end">
        <Pill tone={rolDe(t)[user.role].tono}>{rolDe(t)[user.role].etiqueta}</Pill>
      </div>

      <div className="text-[13px] text-ink-soft [font-variant-numeric:lining-nums] max-[859px]:hidden">
        {user.eventos === 0 ? <span className="text-ink-mute">—</span> : plural(user.eventos, t('evento', 'event'), t('eventos', 'events'))}
      </div>

      <div className="text-[12px] text-ink-mute max-[859px]:hidden">{user.ultimoAcceso ?? t('Nunca entró', 'Never signed in')}</div>

      <div className="justify-self-end max-[859px]:col-start-2">
        {user.esUnoMismo ? null : (
          <MenuDeAcciones etiqueta={t(`Más acciones de ${user.email}`, `More actions for ${user.email}`)}>
            {puedeSerAdmin ? (
              <form action={cambiarRol}>
                <input name="userId" type="hidden" value={user.id} />
                <input name="role" type="hidden" value={user.role === 'admin' ? 'atelier' : 'admin'} />
                <button className={opcionDeMenu()} disabled={cambiando} type="submit">
                  {user.role === 'admin' ? t('Quitar el rol de administrador', 'Remove the administrator role') : t('Hacer administrador', 'Make administrator')}
                </button>
              </form>
            ) : null}
            <ConfirmAction
              action={borrar}
              confirmLabel={t('Borrar usuario', 'Delete user')}
              describedBy={user.eventos > 0 ? `${id}-borrar` : undefined}
              description={
                <>
                  {t('Se borra la cuenta de', 'This deletes the account of')} <strong className="font-normal text-ink">{user.email}</strong>{' '}
                  {t('y deja de poder entrar. Sus accesos a eventos se quitan. No se puede deshacer.', 'and they can no longer sign in. Their event access is removed. This cannot be undone.')}
                </>
              }
              disabled={user.eventos > 0}
              title={t('Borrar usuario', 'Delete user')}
              tone="danger"
              trigger={t('Borrar la cuenta', 'Delete the account')}
              triggerClassName={opcionDeMenu(true)}
            >
              <input name="userId" type="hidden" value={user.id} />
            </ConfirmAction>
            {user.eventos > 0 ? (
              <p className="px-3 pb-2 text-[12px] leading-[1.4] text-ink-mute" id={`${id}-borrar`}>
                {t('Para borrarla, reasigna o borra antes sus eventos.', 'To delete it, first reassign or delete their events.')}
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
  const t = useT()
  const [estado, borrar] = useActionState<AdminActionState, FormData>(sinCaerse(deleteUserAction), INICIAL)
  return (
    <div className="flex flex-col gap-1.5">
      <ConfirmAction
        action={borrar}
        confirmLabel={t('Borrar la cuenta', 'Delete the account')}
        description={
          <>
            <strong className="font-normal text-ink">{email}</strong>{' '}
            {t('deja de poder entrar al panel y pierde el acceso a sus eventos. Los eventos no se borran. No se puede deshacer.', 'can no longer sign in to the panel and loses access to their events. The events are not deleted. This cannot be undone.')}
          </>
        }
        title={t('Borrar la cuenta del cliente', 'Delete the client’s account')}
        tone="danger"
        trigger={t('Borrar su cuenta', 'Delete their account')}
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

'use client'

import { useActionState, useId, useRef } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import type { Role } from '@/modules/identity/domain/access'
import { createUserAction, deleteUserAction, setUserPlanAction, setUserRoleAction, type AdminActionState } from '../actions'

const INICIAL: AdminActionState = { status: 'idle' }

export type UserView = {
  readonly id: string
  readonly email: string
  readonly role: Role
  readonly eventos: number
  readonly esUnoMismo: boolean
  readonly planSlug: string | null
  /** Ya formateada en la página. */
  readonly alta: string
}

const ROL: Record<Role, { etiqueta: string; tono: 'ok' | 'maybe' | 'pending' | 'no' }> = {
  admin: { etiqueta: 'Administrador', tono: 'ok' },
  atelier: { etiqueta: 'Atelier', tono: 'pending' },
  cliente: { etiqueta: 'Cliente', tono: 'maybe' },
  puerta: { etiqueta: 'Puerta', tono: 'no' },
}

/**
 * El alta de usuario, dentro del modal que abre «+ Agregar usuario».
 *
 * **La contraseña inicial la escribe el admin** y le llega al usuario por correo; la primera
 * vez que entra, el panel le obliga a elegir una suya.
 */
export function NewUserForm({ planes }: { planes: readonly string[] }) {
  const [estado, accion, pendiente] = useActionState<AdminActionState, FormData>(createUserAction, INICIAL)
  const id = useId()
  // Tras un error vuelve lo enviado: React vacía el formulario al acabar la acción.
  const enviado = estado.status === 'error' ? estado.valores : undefined

  return (
    // `key` remonta el formulario tras un error: un `<select>` no toma un `defaultValue` nuevo
    // al volver a pintar, y el rol y el plan volvían a su valor inicial.
    <form key={enviado ? JSON.stringify(enviado) : 'alta'} action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
          Correo
        </label>
        <input
          autoComplete="off"
          className={FIELD_CLASS}
          defaultValue={enviado?.email ?? ''}
          id={`${id}-correo`}
          name="email"
          placeholder="nombre@correo.com"
          required
          type="email"
        />
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
          placeholder="Mínimo 12 caracteres"
          required
          type="text"
        />
      </div>

      <div className="grid gap-4 min-[560px]:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-rol`}>
            Rol
          </label>
          <select className={FIELD_CLASS} defaultValue={enviado?.role || 'cliente'} id={`${id}-rol`} name="role">
            <option value="cliente">Cliente</option>
            <option value="atelier">Atelier</option>
            <option value="admin">Administrador</option>
            {/* El personal de puerta se da de alta desde el propio evento, que es quien
                sabe qué boda trabaja: un puerta sin evento asignado no puede hacer nada. */}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL_CLASS} htmlFor={`${id}-plan`}>
            Plan que compró
          </label>
          <select className={FIELD_CLASS} defaultValue={enviado?.planSlug ?? ''} id={`${id}-plan`} name="planSlug">
            <option value="">Sin plan</option>
            {planes.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] leading-[1.6] text-ink-mute">
        La contraseña no se vuelve a mostrar: cópiala antes de enviarla. Un cliente ve su boda cuando se le da acceso
        desde Todos los eventos → «Gestionar».
      </p>

      {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
      {estado.status === 'success' && estado.message !== undefined ? <PanelAlert tone="ok">{estado.message}</PanelAlert> : null}

      <PanelButton className="w-full" disabled={pendiente} type="submit" variant="primary">
        {pendiente ? 'Creando…' : 'Crear usuario'}
      </PanelButton>
    </form>
  )
}

/**
 * Una fila de la tabla de usuarios.
 *
 * **Lo que no se puede hacer no se enseña**, en vez de pintarse deshabilitado: tu propia
 * cuenta no tiene «Quitar admin» ni «Borrar», y a un cliente o a un puerta no se le ofrece
 * hacerse admin. Botones grises en cada fila son ruido que obliga a leer por qué están así.
 *
 * El plan **se guarda al elegirlo**: un botón «Guardar plan» por fila duplicaba el gesto y
 * encajonaba la fila.
 */
export function UserRow({ user, planes }: { user: UserView; planes: readonly string[] }) {
  const [rol, cambiarRol, cambiando] = useActionState<AdminActionState, FormData>(setUserRoleAction, INICIAL)
  const [borrado, borrar, borrando] = useActionState<AdminActionState, FormData>(deleteUserAction, INICIAL)
  const [plan, cambiarPlan, cambiandoPlan] = useActionState<AdminActionState, FormData>(setUserPlanAction, INICIAL)
  const formularioPlan = useRef<HTMLFormElement>(null)
  const planId = useId()
  const error = [rol, borrado, plan].find((e) => e.status === 'error')
  const puedeSerAdmin = user.role === 'admin' || user.role === 'atelier'
  const celda = 'border-b border-line-panel py-3.5 pr-4 align-middle'

  return (
    <tr>
      <td className={celda}>
        <span className="flex items-center gap-2 text-[14px] text-ink">
          {user.email}
          {user.esUnoMismo ? <span className="font-mono text-[9px] tracking-[0.2em] text-ink-mute uppercase">· tú</span> : null}
        </span>
        <span className="mt-0.5 block text-[11px] text-ink-mute">Alta {user.alta}</span>
        {error && error.status === 'error' ? (
          <span className="mt-1 block text-[12px] text-danger" role="alert">
            {error.message}
          </span>
        ) : null}
      </td>

      <td className={celda}>
        <Pill tone={ROL[user.role].tono}>{ROL[user.role].etiqueta}</Pill>
      </td>

      <td className={celda}>
        <form action={cambiarPlan} ref={formularioPlan}>
          <input name="userId" type="hidden" value={user.id} />
          <input name="email" type="hidden" value={user.email} />
          <label className="sr-only" htmlFor={planId}>
            Plan que compró {user.email}
          </label>
          <select
            className={`${FIELD_CLASS} w-[150px] py-2 text-[13px]`}
            defaultValue={user.planSlug ?? ''}
            disabled={cambiandoPlan}
            id={planId}
            name="planSlug"
            onChange={() => formularioPlan.current?.requestSubmit()}
          >
            <option value="">Sin plan</option>
            {planes.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
        </form>
      </td>

      <td className={`${celda} font-display text-[18px] text-ink [font-variant-numeric:lining-nums]`}>{user.eventos}</td>

      <td className={`${celda} pr-0`}>
        {user.esUnoMismo ? (
          <span className="flex justify-end text-[12px] text-ink-mute">Tu cuenta</span>
        ) : (
          <span className="flex justify-end gap-2">
            {puedeSerAdmin ? (
              <form action={cambiarRol}>
                <input name="userId" type="hidden" value={user.id} />
                <input name="role" type="hidden" value={user.role === 'admin' ? 'atelier' : 'admin'} />
                <PanelButton disabled={cambiando} type="submit">
                  {user.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                </PanelButton>
              </form>
            ) : null}
            {user.eventos === 0 ? (
              <form action={borrar}>
                <input name="userId" type="hidden" value={user.id} />
                <PanelButton disabled={borrando} type="submit" variant="danger">
                  Borrar
                </PanelButton>
              </form>
            ) : (
              <span className="self-center text-[11px] text-ink-mute" title="Reasígnale o borra sus eventos desde Todos los eventos">
                Gestiona eventos
              </span>
            )}
          </span>
        )}
      </td>
    </tr>
  )
}

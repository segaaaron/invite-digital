'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
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
}

/**
 * El alta de usuario.
 *
 * **La contraseña inicial se enseña una sola vez**, aquí, y la escribe el admin: no hay
 * registro público ni recuperación por correo —no hay proveedor de correo—, así que
 * esta pantalla es la única puerta junto a `pnpm user:create`.
 */
export function NewUserForm({ planes }: { planes: readonly string[] }) {
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
          <option value="cliente">Cliente — solo su boda</option>
          <option value="admin">Administrador — todo el sistema</option>
          {/* El personal de puerta se da de alta desde el propio evento, que es quien
              sabe qué boda trabaja: aquí no aparece, porque un puerta sin evento
              asignado no puede hacer nada. */}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className={LABEL_CLASS} htmlFor={`${id}-plan`}>
          Plan que compró
        </label>
        <select className={FIELD_CLASS} defaultValue="" id={`${id}-plan`} name="planSlug">
          <option value="">Sin plan</option>
          {planes.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
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
export function UserRow({ user, planes }: { user: UserView; planes: readonly string[] }) {
  const [rol, cambiarRol, cambiando] = useActionState<AdminActionState, FormData>(setUserRoleAction, INICIAL)
  const [borrado, borrar, borrando] = useActionState<AdminActionState, FormData>(deleteUserAction, INICIAL)
  const [plan, cambiarPlan, cambiandoPlan] = useActionState<AdminActionState, FormData>(setUserPlanAction, INICIAL)
  const planId = useId()
  const error =
    rol.status === 'error'
      ? rol.message
      : borrado.status === 'error'
        ? borrado.message
        : plan.status === 'error'
          ? plan.message
          : null

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

        <Pill tone={user.role === 'admin' ? 'ok' : user.role === 'puerta' ? 'maybe' : 'pending'}>
          {user.role === 'admin' ? 'Administrador' : user.role === 'puerta' ? 'Puerta' : user.role === 'cliente' ? 'Cliente' : 'Atelier'}
        </Pill>

        <form action={cambiarPlan} className="flex items-center gap-2">
          <input name="userId" type="hidden" value={user.id} />
          <input name="email" type="hidden" value={user.email} />
          <label className="sr-only" htmlFor={planId}>
            Plan que compró {user.email}
          </label>
          <select className={`${FIELD_CLASS} w-auto py-2 text-[13px]`} defaultValue={user.planSlug ?? ''} id={planId} name="planSlug">
            <option value="">Sin plan</option>
            {planes.map((slug) => (
              <option key={slug} value={slug}>
                {slug}
              </option>
            ))}
          </select>
          <PanelButton disabled={cambiandoPlan} type="submit">
            {cambiandoPlan ? 'Guardando…' : 'Guardar plan'}
          </PanelButton>
        </form>

        {/* Cambiar el rol y borrar son dos formularios distintos: uno solo con dos
            emisores obligaría a leer el `decision` para saber qué se pidió. */}
        <form action={cambiarRol}>
          <input name="userId" type="hidden" value={user.id} />
          <input name="role" type="hidden" value={user.role === 'admin' ? 'atelier' : 'admin'} />
          {/* Al personal de puerta no se le ofrece el ascenso desde aquí: su alta y su
              baja las hace el dueño del evento en el que trabaja. */}
          <PanelButton disabled={cambiando || user.esUnoMismo || user.role === 'puerta'} type="submit">
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

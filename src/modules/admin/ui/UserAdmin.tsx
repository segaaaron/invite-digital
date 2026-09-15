'use client'

import { useActionState, useId, useRef } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import type { Role } from '@/modules/identity'
import { type AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { createUserAction, deleteUserAction, setUserPlanAction, setUserRoleAction } from '@/app/_acciones/admin/usuarios-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

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
export function NewUserForm({ planes }: { planes: readonly { slug: string; nombre: string }[] }) {
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
              <option key={plan.slug} value={plan.slug}>
                {plan.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] leading-[1.6] text-ink-mute">
        La contraseña no se vuelve a mostrar: cópiala antes de enviarla. Un cliente ve su boda cuando se le da acceso
        desde Todos los eventos → «Gestionar».
      </p>

      <ActionFeedback state={estado} />

      <SubmitButton className="w-full" variant="primary" pending={pendiente} pendingLabel={'Creando…'}>{'Crear usuario'}</SubmitButton>
    </form>
  )
}

/**
 * Una fila de la tabla de usuarios.
 *
 * Ocultar o deshabilitar sigue la pauta de Smashing/NN/g: **se oculta lo que no se tiene por
 * permiso** —tus propias acciones, «Hacer admin» a un cliente o a un puerta— y **se
 * deshabilita, explicando cómo habilitarlo, lo que está bloqueado por una condición que
 * puede cambiar**: «Borrar» mientras el usuario gestione eventos.
 *
 * El plan **se guarda al elegirlo** y lo confirma en la fila: un guardado automático sin
 * confirmación deja al admin sin saber si se guardó.
 */
export function UserRow({ user, planes }: { user: UserView; planes: readonly { slug: string; nombre: string }[] }) {
  const [rol, cambiarRol, cambiando] = useActionState<AdminActionState, FormData>(setUserRoleAction, INICIAL)
  const [borrado, borrar, borrando] = useActionState<AdminActionState, FormData>(deleteUserAction, INICIAL)
  const [plan, cambiarPlan, cambiandoPlan] = useActionState<AdminActionState, FormData>(setUserPlanAction, INICIAL)
  const formularioPlan = useRef<HTMLFormElement>(null)
  const planId = useId()
  const error = [rol, borrado, plan].find((e) => e.status === 'error')
  const puedeSerAdmin = user.role === 'admin' || user.role === 'atelier'
  // En el teléfono la fila es una tarjeta y cada celda un bloque: sin cabecera, así que la
  // celda del plan y la de eventos llevan su propio rótulo visible.
  const celda = 'border-b border-line-panel py-3.5 pr-4 align-middle max-[560px]:block max-[560px]:border-0 max-[560px]:py-1.5 max-[560px]:pr-0'

  return (
    <tr className="max-[560px]:block max-[560px]:rounded-[14px] max-[560px]:border max-[560px]:border-line-panel max-[560px]:bg-white max-[560px]:p-4">
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
        {/* `key` con el plan guardado: tras la acción React devuelve el formulario a su valor
            inicial, y un `<select>` no toma el `defaultValue` nuevo al volver a pintar —se
            veía «Sin plan» con el plan ya guardado—. Remontarlo lo pinta de verdad. El estado
            «Guardado» vive en la fila, no en el formulario, y sobrevive al remontaje. */}
        <form action={cambiarPlan} key={user.planSlug ?? 'sin-plan'} ref={formularioPlan}>
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
            {planes.map((plan) => (
              <option key={plan.slug} value={plan.slug}>
                {plan.nombre}
              </option>
            ))}
          </select>
          <span aria-live="polite" className="mt-1 block h-4 text-[11px] text-ink-mute">
            {cambiandoPlan ? 'Guardando…' : plan.status === 'success' ? 'Guardado' : ''}
          </span>
        </form>
      </td>

      <td className={`${celda} font-display text-[18px] text-ink [font-variant-numeric:lining-nums]`}>
        {user.eventos}
        <span className="ml-1.5 font-sans text-[12px] text-ink-mute min-[560px]:hidden">evento{user.eventos === 1 ? '' : 's'}</span>
      </td>

      <td className={`${celda} pr-0`}>
        {user.esUnoMismo ? (
          <span className="flex justify-end text-[12px] text-ink-mute max-[560px]:justify-start">Tu cuenta</span>
        ) : (
          <span className="flex justify-end gap-2 max-[560px]:justify-start">
            {puedeSerAdmin ? (
              <form action={cambiarRol}>
                <input name="userId" type="hidden" value={user.id} />
                <input name="role" type="hidden" value={user.role === 'admin' ? 'atelier' : 'admin'} />
                <PanelButton disabled={cambiando} type="submit">
                  {user.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                </PanelButton>
              </form>
            ) : null}
            <form action={borrar}>
              <input name="userId" type="hidden" value={user.id} />
              <PanelButton
                aria-describedby={user.eventos > 0 ? `${planId}-borrar` : undefined}
                disabled={borrando || user.eventos > 0}
                type="submit"
                variant="danger"
              >
                Borrar
              </PanelButton>
            </form>
          </span>
        )}
        {!user.esUnoMismo && user.eventos > 0 ? (
          <span className="mt-1.5 block text-right text-[11px] text-ink-mute max-[560px]:text-left" id={`${planId}-borrar`}>
            Para borrarlo, reasigna o borra sus {user.eventos} evento{user.eventos === 1 ? '' : 's'} en Todos los eventos.
          </span>
        ) : null}
      </td>
    </tr>
  )
}

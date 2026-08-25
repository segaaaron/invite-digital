'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { addDoorStaffAction, removeDoorStaffAction, type StaffActionState } from '../staff-actions'

const INICIAL: StaffActionState = { status: 'idle' }

export type StaffMember = { readonly userId: string; readonly email: string }

/**
 * El personal de puerta de **este** evento.
 *
 * Vive en Configuración y no en la administración porque quien contrata a la edecán es el
 * dueño de la boda, no el administrador del sistema. Y es por evento y no por atelier
 * porque una persona de puerta trabaja una noche: darle todas las bodas sería darle las
 * listas de invitados de clientes que no son suyos.
 */
export function DoorStaff({
  eventId,
  eventSlug,
  members,
}: {
  eventId: string
  eventSlug: string
  members: readonly StaffMember[]
}) {
  const [alta, darAlta, dandoAlta] = useActionState<StaffActionState, FormData>(addDoorStaffAction, INICIAL)
  const [baja, darBaja, dandoBaja] = useActionState<StaffActionState, FormData>(removeDoorStaffAction, INICIAL)
  const id = useId()

  return (
    <div className="flex flex-col gap-4.5">
      <p className="text-[12px] leading-[1.7] text-ink-soft">
        Quien esté aquí entra al panel y ve <strong className="font-normal text-ink">solo el check-in de este
        evento</strong>: ni la lista de invitados, ni mesas, ni regalos, ni mensajes.
      </p>

      {members.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Todavía no hay nadie asignado a la puerta.</p>
      ) : (
        <ul className="flex flex-col">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3 border-b border-line-panel py-3 last:border-none">
              <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{member.email}</span>
              <form action={darBaja}>
                <input name="eventId" type="hidden" value={eventId} />
                <input name="eventSlug" type="hidden" value={eventSlug} />
                <input name="userId" type="hidden" value={member.userId} />
                {/* Quita el acceso a **esta** boda, no la cuenta: la misma persona puede
                    estar en la puerta de otra tuya la semana que viene. */}
                <PanelButton disabled={dandoBaja} title="Le quita el acceso a este evento" type="submit">
                  Quitar
                </PanelButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={darAlta} className="flex flex-col gap-3.5 border-t border-line-panel pt-4.5">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="eventSlug" type="hidden" value={eventSlug} />

        <div className="grid gap-3.5 min-[560px]:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
              Correo
            </label>
            <input className={FIELD_CLASS} id={`${id}-correo`} name="email" required type="email" />
          </div>

          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-clave`}>
              Contraseña
            </label>
            <input
              autoComplete="new-password"
              className={FIELD_CLASS}
              id={`${id}-clave`}
              minLength={12}
              name="password"
              type="text"
            />
          </div>
        </div>

        <p className="text-[11px] leading-[1.7] text-ink-mute">
          Si ese correo ya tiene cuenta, se le da acceso a esta puerta y su contraseña no se toca. Si es nuevo, la
          contraseña que escribas es con la que entrará, y no se vuelve a mostrar.
        </p>

        {alta.status === 'error' || baja.status === 'error' ? (
          <p className="text-[13px] text-danger" role="alert">
            {alta.status === 'error' ? alta.message : baja.status === 'error' ? baja.message : null}
          </p>
        ) : null}
        {alta.status === 'success' && alta.message !== undefined ? (
          <p className="text-[13px] text-sage" role="status">
            {alta.message}
          </p>
        ) : null}

        <PanelButton className="w-fit" disabled={dandoAlta} type="submit" variant="primary">
          {dandoAlta ? 'Dando acceso…' : 'Dar acceso a la puerta'}
        </PanelButton>
      </form>
    </div>
  )
}

'use client'

import { useActionState } from 'react'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { removeDoorStaffAction, type StaffActionState } from '@/app/_acciones/events/staff-actions'

const INICIAL: StaffActionState = { status: 'idle' }

export type StaffMember = { readonly userId: string; readonly email: string }

/**
 * El personal de puerta **con cuenta** de este evento: solo los que ya existen, para poder
 * quitarlos.
 *
 * Ya no se dan de alta aquí. La recepción se suma desde «Ingreso al evento» con enlace y PIN,
 * sin cuenta ni contraseña que escribir y con la ventana del día del evento; tener dos formas
 * de dar acceso a la puerta era no saber cuál usar. La página solo pinta esta tarjeta si queda
 * alguien.
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
  const [baja, darBaja, dandoBaja] = useActionState<StaffActionState, FormData>(removeDoorStaffAction, INICIAL)

  return (
    <div className="flex flex-col gap-4.5">
      <p className="text-[12px] leading-[1.7] text-ink-soft">
        Estas cuentas entran al panel y ven <strong className="font-normal text-ink">solo el check-in de este evento</strong>.
        El personal nuevo se suma desde <strong className="font-normal text-ink">Ingreso al evento → Recepción</strong>, con
        enlace y PIN, sin cuenta.
      </p>

      <ul className="flex flex-col">
        {members.map((member) => (
          <li key={member.userId} className="flex items-center gap-3 border-b border-line-panel py-3 last:border-none">
            <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{member.email}</span>
            <form action={darBaja}>
              <input name="eventId" type="hidden" value={eventId} />
              <input name="eventSlug" type="hidden" value={eventSlug} />
              <input name="userId" type="hidden" value={member.userId} />
              {/* Quita el acceso a **esta** boda, no la cuenta: la misma persona puede
                  estar en la puerta de otra la semana que viene. */}
              <PanelButton disabled={dandoBaja} title="Le quita el acceso a este evento" type="submit">
                Quitar
              </PanelButton>
            </form>
          </li>
        ))}
      </ul>

      {baja.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {baja.message}
        </p>
      ) : null}
    </div>
  )
}

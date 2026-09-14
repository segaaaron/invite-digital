'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { addEventClientAction, removeDoorStaffAction, type StaffActionState } from '../staff-actions'
import type { StaffMember } from './DoorStaff'

const INICIAL: StaffActionState = { status: 'idle' }

/**
 * El acceso del cliente a **su** evento: los novios, la quinceañera.
 *
 * Vive en Configuración, junto al personal de puerta, porque es la misma decisión —quién
 * entra a esta boda sin ser el atelier— y la toma quien la vendió.
 *
 * El cliente **no** pasa a ser dueño del evento. El dueño sigue siendo el atelier: pasarle
 * la propiedad dejaría fuera a quien hace el trabajo el día que el cliente cambiara algo.
 * Es una pertenencia, como la de la puerta, y se quita igual de fácil.
 */
export function EventClients({
  eventId,
  eventSlug,
  members,
}: {
  eventId: string
  eventSlug: string
  members: readonly StaffMember[]
}) {
  const [alta, darAlta, dandoAlta] = useActionState<StaffActionState, FormData>(addEventClientAction, INICIAL)
  const [baja, darBaja, dandoBaja] = useActionState<StaffActionState, FormData>(removeDoorStaffAction, INICIAL)
  const id = useId()

  return (
    <div className="flex flex-col gap-4.5">
      <p className="text-[12px] leading-[1.7] text-ink-soft">
        Quien esté aquí entra al panel y ve <strong className="font-normal text-ink">solo este evento</strong>: sus
        invitados, las confirmaciones, las mesas, la mesa de regalos y los mensajes, y reparte sus enlaces. No edita el
        diseño ni el contenido, no toca el plan y no puede borrar el evento.
      </p>

      {members.length === 0 ? (
        <p className="text-[13px] text-ink-mute">Todavía no le diste acceso a nadie.</p>
      ) : (
        <ul className="flex flex-col">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3 border-b border-line-panel py-3 last:border-none">
              <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{member.email}</span>
              <form action={darBaja}>
                <input name="eventId" type="hidden" value={eventId} />
                <input name="eventSlug" type="hidden" value={eventSlug} />
                <input name="userId" type="hidden" value={member.userId} />
                {/* Quita el acceso a **esta** boda, nunca la cuenta. */}
                <PanelButton disabled={dandoBaja} title="Le quita el acceso a este evento" type="submit">
                  Quitar
                </PanelButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={darAlta} className="flex flex-col gap-4">
        <div className="grid gap-4 min-[560px]:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-correo`}>
              Correo del cliente
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
              type="text"
            />
          </div>
        </div>

        <p className="text-[11px] leading-[1.7] text-ink-mute">
          La contraseña se enseña aquí y no se vuelve a mostrar: en la base solo queda su hash. Cópiala antes de
          enviársela. Si el correo ya tiene cuenta, se le da acceso sin tocar su contraseña.
        </p>

        <PanelButton disabled={dandoAlta} type="submit" variant="primary">
          {dandoAlta ? 'Dando acceso…' : 'Dar acceso al cliente'}
        </PanelButton>

        {alta.status === 'error' ? (
          <p className="text-[13px] text-danger" role="alert">
            {alta.message}
          </p>
        ) : null}
        {alta.status === 'success' && alta.message !== undefined ? (
          <p aria-live="polite" className="text-[13px] text-ink-soft" role="status">
            {alta.message}
          </p>
        ) : null}
        {baja.status === 'error' ? (
          <p className="text-[13px] text-danger" role="alert">
            {baja.message}
          </p>
        ) : null}
      </form>
    </div>
  )
}

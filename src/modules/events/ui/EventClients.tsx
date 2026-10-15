'use client'

import { useActionState, useId, useRef } from 'react'
import { CloseIcon, KeyIcon, ArrowLeftIcon } from '@/shared/design/ui/icons'
import { FIELD_CLASS, Iniciales, LABEL_CLASS, PanelAlert, Pill, botonClases } from '@/shared/design/ui/panel/PanelKit'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { addEventClientAction, removeDoorStaffAction, type StaffActionState } from '@/app/_acciones/events/staff-actions'
import { resetClientAccessAction, type SupportState } from '@/app/_acciones/admin/support-actions'
import type { StaffMember } from './DoorStaff'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: StaffActionState = { status: 'idle' }
const INICIAL_REINICIO: SupportState = { status: 'idle' }

/**
 * «Accesos» de la ficha del evento (maqueta E35): quién entra a esta boda sin ser el atelier.
 *
 * Arriba, «Dar acceso al cliente» abre su diálogo (E34): nombre, correo y teléfono; la contraseña la genera
 * el sistema y le llega por correo. Cada anfitrión en su fila, con «Restablecer acceso» (E66) y «Quitar».
 *
 * El cliente **no** pasa a ser dueño del evento. El dueño sigue siendo el atelier: pasarle la propiedad
 * dejaría fuera a quien hace el trabajo. Es una pertenencia, como la de la puerta, y se quita igual de fácil.
 */
export function EventClients({
  eventId,
  eventSlug,
  members,
  puerta = [],
}: {
  eventId: string
  eventSlug: string
  members: readonly StaffMember[]
  /** El personal de puerta con cuenta (las cuentas viejas): se ven y se quitan. */
  puerta?: readonly StaffMember[]
}) {
  const t = useT()
  const [alta, darAlta, dandoAlta] = useActionState<StaffActionState, FormData>(sinCaerse(addEventClientAction), INICIAL)
  const [baja, darBaja, dandoBaja] = useActionState<StaffActionState, FormData>(sinCaerse(removeDoorStaffAction), INICIAL)
  const [reinicio, restablecer] = useActionState(sinCaerse(resetClientAccessAction), INICIAL_REINICIO)
  const dialogo = useRef<HTMLDialogElement>(null)
  const id = useId()
  const cerrar = () => dialogo.current?.close()

  const quitar = (member: StaffMember) => (
    <form action={darBaja}>
      <input name="eventId" type="hidden" value={eventId} />
      <input name="eventSlug" type="hidden" value={eventSlug} />
      <input name="userId" type="hidden" value={member.userId} />
      {/* Quita el acceso a **esta** boda, nunca la cuenta. */}
      <button className="min-h-11 cursor-pointer text-[14.5px] font-medium text-gold-deep hover:underline disabled:opacity-50" disabled={dandoBaja} title={t('Le quita el acceso a este evento', 'Removes their access to this event')} type="submit">
        {t('Quitar', 'Remove')}
      </button>
    </form>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[24px] font-medium" id="accesos">
          {t('Accesos', 'Access')}
        </h2>
        <button aria-haspopup="dialog" className={`${botonClases('default')} max-[767px]:hidden`} onClick={() => dialogo.current?.showModal()} type="button">
          <KeyIcon className="size-4" /> {t('Dar acceso al cliente', 'Give the client access')}
        </button>
      </div>

      {members.length === 0 && puerta.length === 0 ? (
        <p className="border-t border-line-panel pt-4 text-[14.5px] text-ink-mute">{t('Sin cliente todavía: lo llevas tú. Entras a su panel con «Entrar al panel del evento», arriba.', 'No client yet: you run it. You enter its panel with “Enter the event panel”, above.')}</p>
      ) : (
        <ul className="flex flex-col border-t border-line-panel">
          {members.map((member) => (
            <li className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-b border-line-panel py-3.5 last:border-none" key={member.userId}>
              <Iniciales chico nombre={member.email} />
              <span className="flex min-w-0 flex-[1_1_200px] flex-col">
                <span className="truncate text-[15px] font-medium">{member.email}</span>
                <span className="text-[13.5px] text-ink-mute">{t('Anfitrión: entra al panel y ve solo este evento', 'Host: signs in to the panel and sees only this event')}</span>
              </span>
              <Pill tone="ok">{t('Activa', 'Active')}</Pill>
              <ConfirmAction
                action={restablecer}
                confirmLabel={t('Restablecer y enviar correo', 'Reset and send email')}
                cuerpo={
                  <ul className="list-disc pl-5 text-[14.5px] text-ink-soft">
                    <li>{t('Se cierran sus sesiones abiertas', 'Their open sessions are closed')}</li>
                    <li>{t('Nadie más ve la contraseña: ni tú', 'No one else sees the password: not even you')}</li>
                    <li>{t('Queda registrado en Auditoría', 'It is recorded in the Audit log')}</li>
                  </ul>
                }
                description={<span className="text-ink">{t(`${member.email} recibirá en su correo una contraseña provisional. Al entrar, elegirá una nueva.`, `${member.email} will receive a temporary password by email. When signing in, they will choose a new one.`)}</span>}
                title={t('Restablecer el acceso', 'Reset access')}
                trigger={t('Restablecer acceso', 'Reset access')}
                triggerClassName="min-h-11 cursor-pointer text-[14.5px] font-medium text-gold-deep hover:underline"
              >
                <input name="eventId" type="hidden" value={eventId} />
                <input name="clientUserId" type="hidden" value={member.userId} />
              </ConfirmAction>
              {quitar(member)}
            </li>
          ))}
          {puerta.map((member) => (
            <li className="flex items-center gap-3.5 border-b border-line-panel py-3.5 last:border-none" key={member.userId}>
              <Iniciales chico nombre={member.email} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-medium">{member.email}</span>
                <span className="text-[13.5px] text-ink-mute">{t('Puerta: solo el ingreso de este evento', 'Door: only this event’s check-in')}</span>
              </span>
              <Pill tone="neutro">{t('Recepción', 'Reception')}</Pill>
              {quitar(member)}
            </li>
          ))}
        </ul>
      )}

      {/* En el celular, a lo ancho bajo la lista (maqueta M24). */}
      <button aria-haspopup="dialog" className={`${botonClases('default')} w-full min-[768px]:hidden`} onClick={() => dialogo.current?.showModal()} type="button">
        <KeyIcon className="size-4" /> {t('Dar acceso al cliente', 'Give the client access')}
      </button>
      {alta.status === 'success' && alta.message !== undefined ? (
        // Fuera del diálogo: cerrado tras el alta, el aviso se quedaría escondido.
        <p aria-live="polite" className="text-[13.5px] text-ink-soft" role="status">
          {alta.message}
        </p>
      ) : null}
      {baja.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {baja.message}
        </p>
      ) : null}
      {reinicio.status === 'error' ? (
        <p className="text-[13px] text-danger" role="alert">
          {reinicio.message}
        </p>
      ) : null}
      {reinicio.status === 'success' ? (
        <PanelAlert tone="ok">
          {reinicio.message}
          {reinicio.password === undefined ? null : (
            <>
              {' '}
              <code className="font-codigo">{reinicio.password}</code>
            </>
          )}
        </PanelAlert>
      ) : null}

      {/* «Dar acceso al cliente» (E34). */}
      <dialog
        aria-labelledby={`${id}-titulo`}
        className="m-auto max-h-[92dvh] w-[min(560px,94vw)] max-w-none overflow-y-auto rounded-[20px] border border-line-panel bg-bg p-7 text-ink shadow-float backdrop:bg-shell-deep/50 max-[767px]:fixed max-[767px]:inset-0 max-[767px]:m-0 max-[767px]:h-dvh max-[767px]:max-h-dvh max-[767px]:w-full max-[767px]:rounded-none max-[767px]:border-0 max-[767px]:px-4 max-[767px]:pt-2.5 max-[767px]:pb-[max(24px,env(safe-area-inset-bottom))]"
        ref={dialogo}
      >
        <button className="mb-5 flex min-h-15 w-full cursor-pointer items-center gap-2 rounded-[18px] border border-line-panel bg-bg-raised px-1.5 text-left shadow-[0_8px_24px_-14px_rgb(12_36_32/0.28)] min-[768px]:hidden" onClick={cerrar} type="button">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center">
            <ArrowLeftIcon className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[13px] text-ink-mute">{t('Ficha del evento', 'Event record')}</span>
            <span className="truncate text-[16px] font-medium">{t('Dar acceso al cliente', 'Give the client access')}</span>
          </span>
          <span className="sr-only">{t(': cerrar', ': close')}</span>
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[30px] leading-tight font-medium max-[767px]:text-[26px]" id={`${id}-titulo`}>
              {t('Dar acceso al cliente', 'Give the client access')}
            </h2>
            <p className="text-[15px] text-ink-mute">{t('Entrará a su boda para escribir la invitación, cargar invitados y enviarlas.', 'They will enter their wedding to write the invitation, add guests and send them.')}</p>
          </div>
          <button aria-label={t('Cerrar', 'Close')} className="max-[767px]:hidden grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] border border-line-panel-strong bg-bg-raised text-ink transition-colors hover:border-gold" onClick={cerrar} type="button">
            <CloseIcon className="size-4" />
          </button>
        </div>
        <form action={darAlta} className="mt-5 flex flex-col gap-4" onSubmit={() => cerrar()}>
          {/* Sin estos dos, el servidor no sabe de qué evento es el alta y responde «ya no existe». */}
          <input name="eventId" type="hidden" value={eventId} />
          <input name="eventSlug" type="hidden" value={eventSlug} />
          <label className="flex flex-col gap-2" htmlFor={`${id}-nombre`}>
            <span className={LABEL_CLASS}>{t('Nombre', 'Name')}</span>
            <input autoComplete="off" className={FIELD_CLASS} id={`${id}-nombre`} maxLength={120} name="nombre" />
          </label>
          <label className="flex flex-col gap-2" htmlFor={`${id}-correo`}>
            <span className={LABEL_CLASS}>{t('Correo del cliente', 'Client’s email')}</span>
            <input autoComplete="off" className={FIELD_CLASS} id={`${id}-correo`} name="email" required type="email" />
            <span className="text-[13px] text-ink-mute">{t('Le llega su usuario y una contraseña provisional. Si ya tiene cuenta, se le suma este evento.', 'They receive their username and a temporary password. If they already have an account, this event is added to it.')}</span>
          </label>
          <label className="flex flex-col gap-2" htmlFor={`${id}-telefono`}>
            <span className={LABEL_CLASS}>{t('Teléfono (opcional)', 'Phone (optional)')}</span>
            <input autoComplete="off" className={FIELD_CLASS} id={`${id}-telefono`} inputMode="tel" maxLength={40} name="telefono" type="tel" />
          </label>
          <p className="rounded-[12px] bg-pill-pending px-4 py-3.5 text-[14.5px] leading-[1.6] text-pill-pending-ink">
            {t('La contraseña la genera el sistema. La primera vez que entre, elegirá una propia.', 'The system generates the password. The first time they sign in, they choose their own.')}
          </p>
          {alta.status === 'error' ? (
            <p className="text-[13px] text-danger" role="alert">
              {alta.message}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2.5 max-[767px]:flex-col-reverse max-[767px]:items-stretch">
            <button className={botonClases('default')} onClick={cerrar} type="button">
              {t('Cancelar', 'Cancel')}
            </button>
            <SubmitButton pending={dandoAlta} pendingLabel={t('Dando acceso…', 'Granting access…')} variant="primary">
              {t('Dar acceso y enviar correo', 'Give access and send email')}
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </div>
  )
}

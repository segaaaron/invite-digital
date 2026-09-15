'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, Field, Pill } from '@/shared/design/ui/panel/PanelKit'
import { addTeamMemberAction, removeTeamMemberAction, type TeamActionState } from '@/app/_acciones/events/team-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: TeamActionState = { status: 'idle' }

export type MiembroVista = { readonly userId: string; readonly email: string; readonly papel: 'anfitrion' | 'coanfitrion' | 'planner' }

const PAPEL = { anfitrion: 'Anfitrión', coanfitrion: 'Co-anfitrión', planner: 'Planner' } as const

/** `null` es sin límite. */
const cupo = (actuales: number, limite: number | null) => (limite === null ? `${actuales} · sin límite` : `${actuales} de ${limite}`)

function Quitar({ eventId, eventSlug, miembro }: { eventId: string; eventSlug: string; miembro: MiembroVista }) {
  const [estado, enviar, enviando] = useActionState(removeTeamMemberAction, INICIAL)
  return (
    <form
      action={enviar}
      className="flex flex-col items-end gap-1"
      onSubmit={(e) => {
        if (!window.confirm(`¿Quitar a ${miembro.email} del equipo? Deja de entrar a este evento en ese momento.`)) e.preventDefault()
      }}
    >
      <input name="eventId" readOnly type="hidden" value={eventId} />
      <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
      <input name="userId" readOnly type="hidden" value={miembro.userId} />
      <input name="email" readOnly type="hidden" value={miembro.email} />
      <SubmitButton aria-label={`Quitar a ${miembro.email}`} variant="danger" pending={enviando} pendingLabel={'Quitando…'}>{'Quitar'}</SubmitButton>
      {estado.status === 'error' ? <span className="text-[11px] text-danger-deep" role="alert">{estado.message}</span> : null}
    </form>
  )
}

/**
 * El equipo del evento. El anfitrión suma a quien le ayuda a organizar —co-anfitriones y su
 * planner— por correo. La contraseña provisional llega por correo; si no sale, se enseña una
 * vez aquí.
 */
export function TeamCard({
  eventId,
  eventSlug,
  miembros,
  topes,
}: {
  eventId: string
  eventSlug: string
  miembros: readonly MiembroVista[]
  topes: { coanfitriones: number | null; planners: number | null }
}) {
  const [alta, sumar, sumando] = useActionState(addTeamMemberAction, INICIAL)
  const id = useId()
  const cuantos = (p: MiembroVista['papel']) => miembros.filter((m) => m.papel === p).length
  const sinPlanner = topes.planners === 0

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-[62ch] text-[13px] leading-[1.7] text-ink-soft">
        Quien te ayuda a organizar entra con su propia cuenta. Los co-anfitriones ven la planificación y los invitados; tu planner,
        además, suma a los porteros. Ninguno puede sumar a más gente, ver el plan comprado ni quitarte a ti.
      </p>

      <ul className="flex flex-col">
        {miembros.map((m) => (
          <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line-panel py-3 last:border-none" key={m.userId}>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[14px] text-ink">{m.email}</span>
              <span className="text-[11px] text-ink-mute">{PAPEL[m.papel]}</span>
            </span>
            {m.papel === 'anfitrion' ? <Pill tone="ok">Quien compró</Pill> : <Quitar eventId={eventId} eventSlug={eventSlug} miembro={m} />}
          </li>
        ))}
      </ul>

      <form action={sumar} className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-bg-raised p-4">
        <input name="eventId" readOnly type="hidden" value={eventId} />
        <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
        <div className="grid gap-3 min-[560px]:grid-cols-2">
          <Field htmlFor={`${id}-email`} label="Correo">
            <input autoComplete="off" className={FIELD_CLASS} id={`${id}-email`} name="email" required type="email" />
          </Field>
          <Field htmlFor={`${id}-kind`} label="Entra como">
            <select className={FIELD_CLASS} defaultValue="coanfitrion" id={`${id}-kind`} name="kind">
              <option value="coanfitrion">Co-anfitrión · {cupo(cuantos('coanfitrion'), topes.coanfitriones)}</option>
              <option disabled={sinPlanner} value="planner">
                Planner · {sinPlanner ? 'tu plan no lo incluye' : cupo(cuantos('planner'), topes.planners)}
              </option>
            </select>
          </Field>
        </div>
        <ActionFeedback state={alta} />
        {alta.status === 'success' && alta.password ? (
          <p className="font-mono text-[15px] tracking-[0.08em] text-ink" aria-label="Contraseña provisional">
            {alta.password}
          </p>
        ) : null}
        <div>
          <SubmitButton variant="primary" pending={sumando} pendingLabel={'Sumando…'}>{'Sumar al equipo'}</SubmitButton>
        </div>
      </form>
    </div>
  )
}

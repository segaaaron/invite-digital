'use client'

import { useActionState, useId, useState } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { addPorterAction, removePorterAction, type PorterActionState } from '@/app/_acciones/checkin/porter-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: PorterActionState = { status: 'idle' }

export type PorteroVista = {
  readonly id: string
  readonly name: string
  readonly gate: string | null
  readonly phone: string | null
  /** Ya formateada por la página, con la zona de Bolivia. */
  readonly createdAt: string
  /** Llegadas que registró, sin las deshechas: quién dejó entrar a quién. */
  readonly registradas: number
  /** Hora de la última, ya formateada; `null` si todavía no registró ninguna. */
  readonly ultima: string | null
}

/**
 * La gente de la puerta de este evento, puesta por quien lo compró.
 *
 * Sumar enseña **una sola vez** el enlace y el PIN —en la base solo quedan sus hashes— y
 * ofrece mandarlos por WhatsApp en un toque. Quitar pide confirmación: corta el acceso al
 * instante, también en un teléfono que ya tenga la puerta abierta.
 */
export function PortersCard({
  eventId,
  eventSlug,
  limite,
  porteros,
}: {
  eventId: string
  eventSlug: string
  limite: number
  porteros: readonly PorteroVista[]
}) {
  const [alta, sumar, sumando] = useActionState(addPorterAction, INICIAL)
  const id = useId()
  const lleno = porteros.length >= limite

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="max-w-[60ch] text-[13px] leading-[1.7] text-ink-soft">
          Las personas que registran la entrada de tus invitados. Cada una recibe su enlace y un PIN, sin crear cuenta.
          Solo ven la puerta de este evento y solo el día del evento.
        </p>
        <span className="font-mono text-[11px] tracking-[0.12em] text-ink-mute uppercase [font-variant-numeric:tabular-nums]">
          {porteros.length} de {limite}
        </span>
      </div>

      {porteros.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line-panel-strong px-4 py-6 text-center text-[13px] text-ink-mute">
          Todavía no sumaste porteros.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-panel rounded-[14px] border border-line-panel bg-white">
          {porteros.map((portero) => (
            <FilaPortero eventId={eventId} eventSlug={eventSlug} key={portero.id} portero={portero} />
          ))}
        </ul>
      )}

      {alta.status === 'created' ? (
        <div className="flex flex-col gap-3 rounded-[14px] border border-sage/40 bg-sage/8 p-4" role="status">
          <p className="text-[14px] text-ink">
            <strong className="font-medium">{alta.nombre}</strong> ya puede entrar a la puerta.
          </p>
          <dl className="grid gap-3 min-[560px]:grid-cols-[1fr_auto]">
            <div className="flex min-w-0 flex-col gap-1">
              <dt className={LABEL_CLASS}>Enlace</dt>
              <dd className="font-mono text-[12px] break-all text-ink">{alta.enlace}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className={LABEL_CLASS}>PIN</dt>
              <dd className="font-mono text-[22px] tracking-[0.2em] text-ink">{alta.pin}</dd>
            </div>
          </dl>
          <p className="text-[12px] text-ink-soft">Cópialos ahora: el PIN no se vuelve a mostrar.</p>
          {alta.whatsapp === null ? null : (
            <PanelButton external href={alta.whatsapp} variant="primary">
              Enviar por WhatsApp
            </PanelButton>
          )}
        </div>
      ) : null}

      <form action={sumar} className="flex flex-col gap-4 border-t border-line-panel pt-5">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="eventSlug" type="hidden" value={eventSlug} />
        <div className="grid gap-4 min-[700px]:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-nombre`}>
              Nombre
            </label>
            <input className={FIELD_CLASS} disabled={lleno} id={`${id}-nombre`} maxLength={80} name="name" placeholder="Carlos Mendoza" required />
          </div>
          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-whatsapp`}>
              WhatsApp (opcional)
            </label>
            <input className={FIELD_CLASS} disabled={lleno} id={`${id}-whatsapp`} inputMode="tel" name="phone" placeholder="+591 700 12345" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={LABEL_CLASS} htmlFor={`${id}-puerta`}>
              Puerta (opcional)
            </label>
            <input className={FIELD_CLASS} disabled={lleno} id={`${id}-puerta`} maxLength={40} name="gate" placeholder="Entrada principal" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton disabled={lleno || sumando} variant="primary" pending={sumando} pendingLabel={'Sumando…'}>{'Agregar portero'}</SubmitButton>
          {lleno ? (
            <span className="text-[12px] text-ink-mute">
              {limite === 0 ? 'Tu plan no incluye porteros.' : `Tu plan admite hasta ${limite} a la vez. Quita a uno para sumar otro.`}
            </span>
          ) : null}
        </div>
        <ActionFeedback errorsOnly state={alta} />
      </form>
    </div>
  )
}

function FilaPortero({ eventId, eventSlug, portero }: { eventId: string; eventSlug: string; portero: PorteroVista }) {
  const [baja, quitar, quitando] = useActionState(removePorterAction, INICIAL)
  const [confirmando, setConfirmando] = useState(false)

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <span className="flex min-w-0 flex-col">
        <span className="text-[14px] text-ink">{portero.name}</span>
        <span className="text-[12px] text-ink-mute">
          {[portero.gate, portero.phone, `sumado el ${portero.createdAt}`].filter(Boolean).join(' · ')}
        </span>
        <span className="text-[12px] text-ink-soft">
          {portero.registradas === 0
            ? 'Todavía no registró llegadas'
            : `${portero.registradas} invitaci${portero.registradas === 1 ? 'ón' : 'ones'} registrada${portero.registradas === 1 ? '' : 's'}${portero.ultima === null ? '' : ` · el último a las ${portero.ultima}`}`}
        </span>
        {baja.status === 'error' ? <span className="text-[12px] text-danger">{baja.message}</span> : null}
      </span>
      {confirmando ? (
        <form action={quitar} className="flex items-center gap-2">
          <input name="eventId" type="hidden" value={eventId} />
          <input name="eventSlug" type="hidden" value={eventSlug} />
          <input name="porterId" type="hidden" value={portero.id} />
          <SubmitButton variant="danger" pending={quitando} pendingLabel={'Quitando…'}>{'Sí, quitar'}</SubmitButton>
          <PanelButton onClick={() => setConfirmando(false)}>Cancelar</PanelButton>
        </form>
      ) : (
        <PanelButton aria-label={`Quitar a ${portero.name}`} onClick={() => setConfirmando(true)} variant="danger">
          Quitar
        </PanelButton>
      )}
    </li>
  )
}

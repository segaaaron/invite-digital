'use client'

import { useActionState, useId } from 'react'
import { empezarEncargoAction, noCuentaAction, versionEnviadaAction, type DisenoState } from '@/app/_acciones/events/diseno-actions'
import type { Diseno } from '@/modules/events/domain/diseno'
import { FIELD_CLASS, LABEL_CLASS, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { diaDelEvento, fechaHora } from '@/shared/format/fecha'

const INICIAL: DisenoState = { status: 'idle', message: '' }

const ESTADO: Record<Diseno['estado'], string> = {
  esperando_datos: 'Esperando sus datos',
  en_diseno: 'En diseño',
  version_enviada: 'Versión enviada, la está revisando',
  aprobada: 'Aprobada por el cliente',
}

export type RondaVista = { readonly id: string; readonly message: string; readonly counts: boolean; readonly createdAt: Date }

/**
 * El diseño por encargo visto por el equipo, en la ficha del evento: en qué paso está, para
 * cuándo se prometió, las rondas que pidió y los botones del siguiente paso.
 */
export function EncargoDelEquipo({
  eventId,
  encargo,
  rondas,
  hoy,
  escribir,
}: {
  eventId: string
  encargo: Diseno | null
  rondas: readonly RondaVista[]
  /** `aaaa-mm-dd` en Bolivia, para decir si la entrega está atrasada. */
  hoy: string
  /** El editor de la invitación para el equipo. */
  escribir: string
}) {
  const [empezado, empezar] = useActionState(sinCaerse(empezarEncargoAction), INICIAL)
  const [enviada, enviar] = useActionState(sinCaerse(versionEnviadaAction), INICIAL)
  const [devuelta, devolver] = useActionState(sinCaerse(noCuentaAction), INICIAL)
  const id = useId()

  if (encargo === null) {
    return (
      <form action={empezar} className="flex flex-col gap-3">
        <input name="eventId" type="hidden" value={eventId} />
        <p className="text-[13px] text-ink-soft">El cliente escribe su invitación solo. Si la diseñamos nosotros, empieza el encargo con sus rondas y su plazo.</p>
        <div className="grid max-w-[360px] grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5" htmlFor={`${id}-rondas`}>
            <span className={LABEL_CLASS}>Rondas</span>
            <input className={FIELD_CLASS} defaultValue="2" id={`${id}-rondas`} max={20} min={0} name="rondas" required type="number" />
          </label>
          <label className="flex flex-col gap-1.5" htmlFor={`${id}-dias`}>
            <span className={LABEL_CLASS}>Días de entrega</span>
            <input className={FIELD_CLASS} defaultValue="3" id={`${id}-dias`} max={60} min={1} name="dias" required type="number" />
          </label>
        </div>
        <ActionFeedback state={empezado} />
        <div>
          <SubmitButton variant="default">Lo diseñamos nosotros</SubmitButton>
        </div>
      </form>
    )
  }

  const atrasado = encargo.entregaHasta !== null && encargo.entregaHasta < hoy

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={encargo.estado === 'aprobada' ? 'ok' : atrasado ? 'no' : 'pending'}>{ESTADO[encargo.estado]}</Pill>
        {encargo.entregaHasta === null ? null : (
          <span className={`text-[13px] ${atrasado ? 'text-danger' : 'text-ink-soft'}`}>
            {atrasado ? 'Atrasado: era para el ' : 'Entrega hasta el '}
            {diaDelEvento(encargo.entregaHasta)}
          </span>
        )}
        <span className="text-[13px] text-ink-mute tabular-nums">
          · rondas {encargo.rondasUsadas} de {encargo.rondasIncluidas}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <PanelButton href={escribir} variant={encargo.estado === 'en_diseno' ? 'primary' : 'default'}>
          Escribir la invitación
        </PanelButton>
        {encargo.estado === 'en_diseno' ? (
          <form action={enviar}>
            <input name="eventId" type="hidden" value={eventId} />
            <SubmitButton variant="default">Versión lista: avisar al cliente</SubmitButton>
          </form>
        ) : null}
      </div>
      <ActionFeedback state={enviada} />

      {rondas.length === 0 ? null : (
        <ul className="flex flex-col gap-2 border-t border-line-panel pt-3">
          {rondas.map((r, i) => (
            <li className="flex flex-col gap-1.5 rounded-[12px] border border-line-panel p-3" key={r.id}>
              <span className="text-[11px] text-ink-mute">
                Ronda {i + 1} · {fechaHora(r.createdAt)}
                {r.counts ? '' : ' · no contó (error nuestro)'}
              </span>
              <p className="text-[13px] whitespace-pre-wrap text-ink">{r.message}</p>
              {r.counts ? (
                <form action={devolver}>
                  <input name="eventId" type="hidden" value={eventId} />
                  <input name="rondaId" type="hidden" value={r.id} />
                  <SubmitButton variant="default">Error nuestro: no cuenta</SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <ActionFeedback state={devuelta} />
    </div>
  )
}

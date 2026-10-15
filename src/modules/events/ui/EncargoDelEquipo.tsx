'use client'

import { useActionState, useId } from 'react'
import { empezarEncargoAction, noCuentaAction, versionEnviadaAction, type DisenoState } from '@/app/_acciones/events/diseno-actions'
import type { Diseno } from '@/modules/events/domain/diseno'
import { FIELD_CLASS, LABEL_CLASS, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { diaDelEvento, fechaHora } from '@/shared/format/fecha'
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

const INICIAL: DisenoState = { status: 'idle', message: '' }

const estadoDe = (t: T): Record<Diseno['estado'], string> => ({
  esperando_datos: t('Esperando sus datos', 'Waiting for their details'),
  en_diseno: t('En diseño', 'In design'),
  version_enviada: t('Versión enviada, la está revisando', 'Version sent, they are reviewing it'),
  aprobada: t('Aprobada por el cliente', 'Approved by the client'),
})

export type RondaVista = { readonly id: string; readonly message: string; readonly counts: boolean; readonly createdAt: Date }

/**
 * El diseño por encargo visto por el equipo, en la ficha del evento: en qué paso está, para
 * cuándo se prometió, las rondas que pidió y los botones del siguiente paso.
 */
/** El rótulo de cada respuesta del formulario del plan, para el equipo. */
const respuestaDe = (t: T): Record<string, string> => ({
  secciones: t('Secciones (quitar, agregar u ordenar)', 'Sections (remove, add or reorder)'),
  tematica: t('Temática', 'Theme'),
  vestido: t('Vestido', 'Dress'),
  decoracion: t('Decoración', 'Decoration'),
  flores: t('Flores', 'Flowers'),
})

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
  const t = useT()
  const [empezado, empezar] = useActionState(sinCaerse(empezarEncargoAction), INICIAL)
  const [enviada, enviar] = useActionState(sinCaerse(versionEnviadaAction), INICIAL)
  const [devuelta, devolver] = useActionState(sinCaerse(noCuentaAction), INICIAL)
  const id = useId()

  if (encargo === null) {
    return (
      <form action={empezar} className="flex flex-col gap-3">
        <input name="eventId" type="hidden" value={eventId} />
        <p className="text-[13px] text-ink-soft">{t('El cliente escribe su invitación solo. Si la diseñamos nosotros, empieza el encargo con sus rondas y su plazo.', 'The client writes their invitation alone. If we design it, start the order with its rounds and its deadline.')}</p>
        <div className="grid max-w-[360px] grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5" htmlFor={`${id}-rondas`}>
            <span className={LABEL_CLASS}>{t('Rondas', 'Rounds')}</span>
            <input className={FIELD_CLASS} defaultValue="2" id={`${id}-rondas`} max={20} min={0} name="rondas" required type="number" />
          </label>
          <label className="flex flex-col gap-1.5" htmlFor={`${id}-dias`}>
            <span className={LABEL_CLASS}>{t('Días de entrega', 'Delivery days')}</span>
            <input className={FIELD_CLASS} defaultValue="3" id={`${id}-dias`} max={60} min={1} name="dias" required type="number" />
          </label>
        </div>
        <ActionFeedback state={empezado} />
        <div>
          <SubmitButton variant="default">{t('Lo diseñamos nosotros', 'We design it')}</SubmitButton>
        </div>
      </form>
    )
  }

  const atrasado = encargo.entregaHasta !== null && encargo.entregaHasta < hoy

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={encargo.estado === 'aprobada' ? 'ok' : atrasado ? 'no' : 'pending'}>{estadoDe(t)[encargo.estado]}</Pill>
        {encargo.entregaHasta === null ? null : (
          <span className={`text-[13px] ${atrasado ? 'text-danger' : 'text-ink-soft'}`}>
            {atrasado ? t('Atrasado: era para el ', 'Late: it was due ') : t('Entrega hasta el ', 'Delivery by ')}
            {diaDelEvento(encargo.entregaHasta, t('es', 'en') === 'es' ? 'es' : 'en')}
          </span>
        )}
        <span className="text-[13px] text-ink-mute tabular-nums">
          · {t(`rondas ${encargo.rondasUsadas} de ${encargo.rondasIncluidas}`, `rounds ${encargo.rondasUsadas} of ${encargo.rondasIncluidas}`)}
        </span>
      </div>

      {/* Lo que el cliente contó en el formulario de su plan: con esto se diseña «creado para ti». */}
      {encargo.brief == null || Object.keys(encargo.brief).length === 0 ? null : (
        <dl className="grid gap-2 rounded-[12px] border border-line-panel p-3 text-[13px]">
          {Object.entries(encargo.brief).map(([pregunta, respuesta]) => (
            <div key={pregunta}>
              <dt className="text-[11px] text-ink-mute">{respuestaDe(t)[pregunta] ?? pregunta}</dt>
              <dd className="whitespace-pre-line text-ink">{respuesta}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap gap-2">
        <PanelButton href={escribir} variant={encargo.estado === 'en_diseno' ? 'primary' : 'default'}>
          {t('Escribir la invitación', 'Write the invitation')}
        </PanelButton>
        {encargo.estado === 'en_diseno' ? (
          <form action={enviar}>
            <input name="eventId" type="hidden" value={eventId} />
            <SubmitButton variant="default">{t('Versión lista: avisar al cliente', 'Version ready: notify the client')}</SubmitButton>
          </form>
        ) : null}
      </div>
      <ActionFeedback state={enviada} />

      {rondas.length === 0 ? null : (
        <ul className="flex flex-col gap-2 border-t border-line-panel pt-3">
          {rondas.map((r, i) => (
            <li className="flex flex-col gap-1.5 rounded-[12px] border border-line-panel p-3" key={r.id}>
              <span className="text-[11px] text-ink-mute">
                {t(`Ronda ${i + 1}`, `Round ${i + 1}`)} · {fechaHora(r.createdAt, t('es', 'en') === 'es' ? 'es' : 'en')}
                {r.counts ? '' : t(' · no contó (error nuestro)', ' · didn’t count (our mistake)')}
              </span>
              <p className="text-[13px] whitespace-pre-wrap text-ink">{r.message}</p>
              {r.counts ? (
                <form action={devolver}>
                  <input name="eventId" type="hidden" value={eventId} />
                  <input name="rondaId" type="hidden" value={r.id} />
                  <SubmitButton variant="default">{t('Error nuestro: no cuenta', 'Our mistake: doesn’t count')}</SubmitButton>
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

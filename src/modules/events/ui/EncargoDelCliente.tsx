'use client'

import { useActionState, useId } from 'react'
import { aprobarVersionAction, enviarADisenoAction, pedirCambiosAction, type DisenoState } from '@/app/_acciones/events/diseno-actions'
import type { Diseno } from '@/modules/events/domain/diseno'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { diaDelEvento } from '@/shared/format/fecha'

const INICIAL: DisenoState = { status: 'idle', message: '' }

const PASOS = ['Tus datos', 'La diseñamos', 'La revisas', 'Aprobada'] as const
const PASO_DE: Record<Diseno['estado'], number> = { esperando_datos: 0, en_diseno: 1, version_enviada: 2, aprobada: 3 }

/**
 * Los pasos del diseño por encargo, como los vive el cliente: manda sus datos, esperamos la
 * versión, la revisa (aprueba o pide cambios, una ronda por mensaje) y queda aprobada.
 */
export function EncargoDelCliente({
  eventId,
  encargo,
  decide,
  saldoPendiente,
  vistaPrevia,
  extras,
}: {
  eventId: string
  encargo: Diseno
  /** Solo quien compró aprueba o pide cambios: su equipo ve el estado. */
  decide: boolean
  saldoPendiente: boolean
  /** La invitación a pantalla completa, para revisarla. */
  vistaPrevia: string
  /** Donde se piden cambios fuera de las rondas. */
  extras: string
}) {
  const [enviado, enviar] = useActionState(sinCaerse(enviarADisenoAction), INICIAL)
  const [cambios, pedir] = useActionState(sinCaerse(pedirCambiosAction), INICIAL)
  const [aprobado, aprobar] = useActionState(sinCaerse(aprobarVersionAction), INICIAL)
  const id = useId()
  const paso = PASO_DE[encargo.estado]
  const quedan = Math.max(0, encargo.rondasIncluidas - encargo.rondasUsadas)

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-4" aria-label="Pasos de tu invitación">
        {PASOS.map((nombre, i) => (
          <li
            aria-current={i === paso ? 'step' : undefined}
            className={`rounded-[12px] border px-3 py-2 text-[12px] ${i === paso ? 'border-ink bg-ink text-bg-raised' : i < paso ? 'border-line-panel text-ink' : 'border-line-panel text-ink-mute'}`}
            key={nombre}
          >
            <span className="tabular-nums">{i + 1}.</span> {nombre}
            {i < paso ? <span className="sr-only"> (hecho)</span> : null}
          </li>
        ))}
      </ol>

      {encargo.estado === 'esperando_datos' ? (
        <form action={enviar} className="flex flex-col gap-3">
          <input name="eventId" type="hidden" value={eventId} />
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Escribe aquí abajo los datos de tu fiesta y sube tus fotos. Cuando termines, envíanoslos y diseñamos tu invitación en{' '}
            {encargo.diasDeEntrega} {encargo.diasDeEntrega === 1 ? 'día' : 'días'}.
          </p>
          <ActionFeedback state={enviado} />
          <div>
            <SubmitButton>Enviar mis datos para diseñar</SubmitButton>
          </div>
        </form>
      ) : null}

      {encargo.estado === 'en_diseno' ? (
        <p className="text-[13px] leading-relaxed text-ink-soft" role="status">
          Estamos diseñando tu invitación.
          {encargo.entregaHasta === null ? null : <> Te la entregamos hasta el <b className="font-medium text-ink">{diaDelEvento(encargo.entregaHasta)}</b>.</>} Te avisamos en la campana cuando esté lista.
        </p>
      ) : null}

      {encargo.estado === 'version_enviada' && !decide ? (
        <p className="text-[13px] leading-relaxed text-ink-soft" role="status">
          La invitación está lista para revisar. La aprueba o pide cambios quien la compró.{' '}
          <a className="underline underline-offset-2" href={vistaPrevia}>
            Verla en pantalla completa
          </a>
          .
        </p>
      ) : null}

      {encargo.estado === 'version_enviada' && decide ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-ink-soft">Tu invitación está lista. Mírala entera y apruébala, o pídenos cambios.</p>
          <div className="flex flex-wrap gap-2">
            <PanelButton href={vistaPrevia}>Verla en pantalla completa</PanelButton>
            <form action={aprobar}>
              <input name="eventId" type="hidden" value={eventId} />
              <SubmitButton>Aprobar mi invitación</SubmitButton>
            </form>
          </div>
          <ActionFeedback state={aprobado} />
          {quedan > 0 ? (
            <form action={pedir} className="flex flex-col gap-2 border-t border-line-panel pt-4">
              <input name="eventId" type="hidden" value={eventId} />
              <label className="flex flex-col gap-2" htmlFor={id}>
                <span className={LABEL_CLASS}>
                  Pedir cambios · te {quedan === 1 ? 'queda 1 ronda' : `quedan ${quedan} rondas`} de {encargo.rondasIncluidas}
                </span>
                <textarea
                  className={`${FIELD_CLASS} min-h-[110px]`}
                  id={id}
                  maxLength={3000}
                  name="mensaje"
                  placeholder="Cambia la hora a 20:00, pon otra foto en la portada y corrige el nombre de mi mamá."
                  required
                />
                <span className="text-[11px] text-ink-mute">Una ronda es un solo mensaje con todos tus cambios juntos. Los errores nuestros no cuentan.</span>
              </label>
              <ActionFeedback state={cambios} />
              <div>
                <SubmitButton variant="default">Enviar mis cambios</SubmitButton>
              </div>
            </form>
          ) : (
            <p className="border-t border-line-panel pt-4 text-[13px] text-ink-soft">
              Ya usaste tus {encargo.rondasIncluidas} rondas de corrección. Puedes aprobarla o pedir un cambio adicional en{' '}
              <a className="underline underline-offset-2" href={extras}>
                Extras
              </a>
              .
            </p>
          )}
        </div>
      ) : null}

      {encargo.estado === 'aprobada' ? (
        <p className="text-[13px] leading-relaxed text-ink-soft" role="status">
          {saldoPendiente
            ? 'Aprobada. En cuanto registremos el saldo de tu plan, ya puedes repartirla desde Invitados.'
            : 'Aprobada y lista: ya puedes repartirla desde Invitados.'}
        </p>
      ) : null}
    </div>
  )
}

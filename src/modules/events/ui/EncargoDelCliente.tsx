'use client'

import { useActionState, useId } from 'react'
import { aprobarVersionAction, enviarADisenoAction, pedirCambiosAction, type DisenoState } from '@/app/_acciones/events/diseno-actions'
import { MAX_RESPUESTA_DEL_ENCARGO, type Diseno, type PreguntaDelEncargo } from '@/modules/events/domain/diseno'
import { FIELD_CLASS, LABEL_CLASS, PanelButton } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { diaDelEvento } from '@/shared/format/fecha'
import { useIdioma, useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'
import { traducir } from '@/shared/i18n/en-ingles'

const INICIAL: DisenoState = { status: 'idle', message: '' }

const pasos = (t: T) => [t('Tus datos', 'Your details'), t('La diseñamos', 'We design it'), t('La revisas', 'You review it'), t('Aprobada', 'Approved')] as const

/** Las preguntas del formulario según el plan (documento de cambios, sección 7). */
const PREGUNTA: Record<PreguntaDelEncargo, { titulo: string; ejemplo: string }> = {
  secciones: { titulo: '¿Qué secciones quieres quitar, agregar u ordenar?', ejemplo: 'Quitar la mesa de regalos, poner el cronograma antes del mapa…' },
  tematica: { titulo: 'La temática de tu fiesta', ejemplo: 'Jardín encantado con mariposas, en verde esmeralda y dorado.' },
  vestido: { titulo: 'Tu vestido', ejemplo: 'Color esmeralda con mariposas bordadas. Manda la foto por WhatsApp.' },
  decoracion: { titulo: 'La decoración del salón', ejemplo: 'Arcos de flores, velas y mesas de madera.' },
  flores: { titulo: 'Las flores', ejemplo: 'Peonías y rosas blancas.' },
}
const PASO_DE: Record<Diseno['estado'], number> = { esperando_datos: 0, en_diseno: 1, version_enviada: 2, aprobada: 3 }

/**
 * Los pasos del diseño por encargo, como los vive el cliente: manda sus datos, esperamos la
 * versión, la revisa (aprueba o pide cambios, una ronda por mensaje) y queda aprobada.
 */
export function EncargoDelCliente({
  eventId,
  encargo,
  decide,
  vistaPrevia,
  extras,
  preguntas = [],
}: {
  eventId: string
  encargo: Diseno
  /** Solo quien compró aprueba o pide cambios: su equipo ve el estado. */
  decide: boolean
  /** La invitación a pantalla completa, para revisarla. */
  vistaPrevia: string
  /** Donde se piden cambios fuera de las rondas. */
  extras: string
  /** Lo que su plan le pregunta además de la invitación: secciones (Gala), temática y más (Imperial). */
  preguntas?: readonly PreguntaDelEncargo[]
}) {
  const t = useT()
  const locale = useIdioma()
  const [enviado, enviar] = useActionState(sinCaerse(enviarADisenoAction), INICIAL)
  const [cambios, pedir] = useActionState(sinCaerse(pedirCambiosAction), INICIAL)
  const [aprobado, aprobar] = useActionState(sinCaerse(aprobarVersionAction), INICIAL)
  const id = useId()
  const paso = PASO_DE[encargo.estado]
  const quedan = Math.max(0, encargo.rondasIncluidas - encargo.rondasUsadas)

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-4" aria-label={t('Pasos de tu invitación', 'Your invitation’s steps')}>
        {pasos(t).map((nombre, i) => (
          <li
            aria-current={i === paso ? 'step' : undefined}
            className={`rounded-[12px] border px-3 py-2 text-[12px] ${i === paso ? 'border-ink bg-ink text-bg-raised' : i < paso ? 'border-line-panel text-ink' : 'border-line-panel text-ink-mute'}`}
            key={nombre}
          >
            <span className="tabular-nums">{i + 1}.</span> {nombre}
            {i < paso ? <span className="sr-only">{t(' (hecho)', ' (done)')}</span> : null}
          </li>
        ))}
      </ol>

      {encargo.estado === 'esperando_datos' ? (
        <form action={enviar} className="flex flex-col gap-3">
          <input name="eventId" type="hidden" value={eventId} />
          <p className="text-[13px] leading-relaxed text-ink-soft">
            {t(`Escribe aquí abajo los datos de tu fiesta y sube tus fotos. Cuando termines, envíanoslos y diseñamos tu invitación en ${encargo.diasDeEntrega} ${encargo.diasDeEntrega === 1 ? 'día' : 'días'}.`, `Write your party’s details below and upload your photos. When you’re done, send them to us and we’ll design your invitation in ${encargo.diasDeEntrega} ${encargo.diasDeEntrega === 1 ? 'day' : 'days'}.`)}
          </p>
          {preguntas.map((pregunta) => (
            <label className="flex flex-col gap-2" key={pregunta}>
              <span className={LABEL_CLASS}>{traducir(PREGUNTA[pregunta].titulo, t)}</span>
              <textarea
                className={`${FIELD_CLASS} min-h-[80px]`}
                defaultValue={encargo.brief?.[pregunta] ?? ''}
                maxLength={MAX_RESPUESTA_DEL_ENCARGO}
                name={`brief_${pregunta}`}
                placeholder={traducir(PREGUNTA[pregunta].ejemplo, t)}
              />
            </label>
          ))}
          <ActionFeedback state={enviado} />
          <div>
            <SubmitButton>{t('Enviar mis datos para diseñar', 'Send my details for design')}</SubmitButton>
          </div>
        </form>
      ) : null}

      {encargo.estado === 'en_diseno' ? (
        <p className="text-[13px] leading-relaxed text-ink-soft" role="status">
          {t('Estamos diseñando tu invitación.', 'We’re designing your invitation.')}
          {encargo.entregaHasta === null ? null : <> {t('Te la entregamos hasta el', 'We’ll deliver it by')} <b className="font-medium text-ink">{diaDelEvento(encargo.entregaHasta, locale)}</b>.</>} {t('Te avisamos en la campana cuando esté lista.', 'We’ll let you know in the bell when it’s ready.')}
        </p>
      ) : null}

      {encargo.estado === 'version_enviada' && !decide ? (
        <p className="text-[13px] leading-relaxed text-ink-soft" role="status">
          {t('La invitación está lista para revisar. La aprueba o pide cambios quien la compró.', 'The invitation is ready to review. Whoever bought it approves it or asks for changes.')}{' '}
          <a className="underline underline-offset-2" href={vistaPrevia}>
            {t('Verla en pantalla completa', 'View it full screen')}
          </a>
          .
        </p>
      ) : null}

      {encargo.estado === 'version_enviada' && decide ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-relaxed text-ink-soft">{t('Tu invitación está lista. Mírala entera y apruébala, o pídenos cambios.', 'Your invitation is ready. Look at it in full and approve it, or ask us for changes.')}</p>
          <div className="flex flex-wrap gap-2">
            <PanelButton href={vistaPrevia}>{t('Verla en pantalla completa', 'View it full screen')}</PanelButton>
            <form action={aprobar}>
              <input name="eventId" type="hidden" value={eventId} />
              <SubmitButton>{t('Aprobar mi invitación', 'Approve my invitation')}</SubmitButton>
            </form>
          </div>
          <ActionFeedback state={aprobado} />
          {quedan > 0 ? (
            <form action={pedir} className="flex flex-col gap-2 border-t border-line-panel pt-4">
              <input name="eventId" type="hidden" value={eventId} />
              <label className="flex flex-col gap-2" htmlFor={id}>
                <span className={LABEL_CLASS}>
                  {t(`Pedir cambios · te ${quedan === 1 ? 'queda 1 ronda' : `quedan ${quedan} rondas`} de ${encargo.rondasIncluidas}`, `Ask for changes · ${quedan === 1 ? '1 round' : `${quedan} rounds`} left of ${encargo.rondasIncluidas}`)}
                </span>
                <textarea
                  className={`${FIELD_CLASS} min-h-[110px]`}
                  id={id}
                  maxLength={3000}
                  name="mensaje"
                  placeholder={t('Cambia la hora a 20:00, pon otra foto en la portada y corrige el nombre de mi mamá.', 'Change the time to 8:00 pm, put another photo on the cover and fix my mom’s name.')}
                  required
                />
                <span className="text-[11px] text-ink-mute">{t('Una ronda es un solo mensaje con todos tus cambios juntos. Los errores nuestros no cuentan.', 'A round is a single message with all your changes together. Our own mistakes don’t count.')}</span>
              </label>
              <ActionFeedback state={cambios} />
              <div>
                <SubmitButton variant="default">{t('Enviar mis cambios', 'Send my changes')}</SubmitButton>
              </div>
            </form>
          ) : (
            <p className="border-t border-line-panel pt-4 text-[13px] text-ink-soft">
              {t(`Ya usaste tus ${encargo.rondasIncluidas} rondas de corrección. Puedes aprobarla o pedir un cambio adicional en`, `You’ve used your ${encargo.rondasIncluidas} revision rounds. You can approve it or request an additional change in`)}{' '}
              <a className="underline underline-offset-2" href={extras}>
                {t('Extras', 'Extras')}
              </a>
              .
            </p>
          )}
        </div>
      ) : null}

      {encargo.estado === 'aprobada' ? (
        <p className="text-[13px] leading-relaxed text-ink-soft" role="status">
          {t('Aprobada y lista.', 'Approved and ready.')}
        </p>
      ) : null}
    </div>
  )
}

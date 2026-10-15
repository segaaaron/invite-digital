'use client'

import { useActionState, useState } from 'react'
import { guardarMensajesAction, type MensajesState } from '@/app/_acciones/admin/mensajes-actions'
import { MENSAJES, rellenar, type Mensajes } from '../domain/mensajes'
import { UnitField } from '@/shared/design/ui/panel/ajustes'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { FIELD_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { traducir } from '@/shared/i18n/en-ingles'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: MensajesState = { status: 'idle' }
/** Lo que se ve en la muestra de cada mensaje: una venta cualquiera. */
const EJEMPLO = { nombre: 'Carla', fecha: 'sáb 14 feb 2027', importe: 'Bs 690,00', enlace: 'luxuryatelier.net/es/pedido/ref/7KQ3M9XA', plan: 'Gala', marca: 'Luxury Atelier' }

/**
 * Las plantillas con **su muestra al lado**, rellenada como la verá el cliente: así se escribe
 * sabiendo cómo queda. Y la agenda: cuántos eventos por día se atienden y el descuento que recibe
 * quien compra recomendado.
 */
export function MensajesForm({ mensajes, capacidad, descuento }: { mensajes: Mensajes; capacidad: number; descuento: number }) {
  const t = useT()
  const [estado, guardar] = useActionState(sinCaerse(guardarMensajesAction), INICIAL)
  const [textos, setTextos] = useState<Mensajes>(mensajes)
  return (
    // La maqueta (E48): las plantillas en su tarjeta y la agenda en la suya, una al lado de la otra. Un solo formulario:
    // cualquiera de los dos «Guardar» guarda todo.
    <form action={guardar} className="flex flex-wrap items-start gap-6">
      <section aria-labelledby="plantillas" className="flex min-w-0 flex-[2_1_460px] flex-col gap-4.5 rounded-[16px] border border-line-panel bg-bg-raised p-6">
        <h2 className="font-display text-[24px] font-medium" id="plantillas">
          {t('Plantillas para responder', 'Reply templates')}
        </h2>
        {MENSAJES.map((m) => (
          <label className="flex flex-col gap-1.5" htmlFor={`mensaje-${m.clave}`} key={m.clave}>
            <span className="text-[14px] font-medium">{traducir(m.titulo, t)}</span>
            <textarea
              aria-describedby={`mensaje-${m.clave}-ayuda`}
              className={`${FIELD_CLASS} min-h-24 leading-relaxed`}
              id={`mensaje-${m.clave}`}
              maxLength={1000}
              name={m.clave}
              onChange={(e) => setTextos((antes) => ({ ...antes, [m.clave]: e.target.value }))}
              placeholder={rellenar(m.porDefecto, EJEMPLO)}
              value={textos[m.clave]}
            />
            <span className="flex justify-between gap-3 text-[13px] text-ink-mute" id={`mensaje-${m.clave}-ayuda`}>
              <span>
                {traducir(m.ayuda, t)} {t('Puedes usar', 'You can use')} {'{nombre}'}, {'{fecha}'}, {'{importe}'}, {'{plan}'}, {'{enlace}'} {t('y', 'and')} {'{marca}'}.
              </span>
              <span className="shrink-0 [font-variant-numeric:tabular-nums]">{textos[m.clave].length}/1000</span>
            </span>
          </label>
        ))}
        <div className="flex items-center justify-end gap-3">
          <ActionFeedback state={estado} />
          <SubmitButton pendingLabel={t('Guardando…', 'Saving…')}>{t('Guardar plantillas', 'Save templates')}</SubmitButton>
        </div>
      </section>

      <section aria-labelledby="agenda" className="flex min-w-0 flex-[1_1_260px] flex-col gap-4 rounded-[16px] border border-line-panel bg-bg-raised p-6">
        <h2 className="font-display text-[24px] font-medium" id="agenda">
          {t('Agenda', 'Calendar')}
        </h2>
        <UnitField defaultValue={String(capacidad)} hint={t('Más allá, el calendario lo marca lleno.', 'Beyond that, the calendar shows it as full.')} id="capacidad" label={t('Eventos por día', 'Events per day')} name="capacidad" required unit={t('eventos', 'events')} />
        <UnitField defaultValue={String(descuento)} hint={t('Lo que recibe quien compra con el código de un cliente.', 'What someone gets when buying with a client’s code.')} id="descuento" label={t('Descuento por recomendar', 'Referral discount')} name="descuento" required unit="%" />
        <div className="flex justify-end">
          <SubmitButton pendingLabel={t('Guardando…', 'Saving…')}>{t('Guardar', 'Save')}</SubmitButton>
        </div>
      </section>
    </form>
  )
}

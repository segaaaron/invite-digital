'use client'

import { useActionState, useState } from 'react'
import { guardarMensajesAction, type MensajesState } from '@/app/_acciones/admin/mensajes-actions'
import { MENSAJES, rellenar, type Mensajes } from '../domain/mensajes'
import { UnitField } from '@/shared/design/ui/panel/ajustes'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { FIELD_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: MensajesState = { status: 'idle' }
/** Lo que se ve en la muestra de cada mensaje: una venta cualquiera. */
const EJEMPLO = { nombre: 'Carla', fecha: 'sáb 14 feb 2027', importe: 'Bs 690,00', enlace: 'luxuryatelier.net/es/pedido/ref/7KQ3M9XA', plan: 'Gala', marca: 'Luxury Atelier' }

/**
 * Las plantillas con **su muestra al lado**, rellenada como la verá el cliente: así se escribe
 * sabiendo cómo queda. Y la agenda: cuántos eventos por día se atienden y el descuento que recibe
 * quien compra recomendado.
 */
export function MensajesForm({ mensajes, capacidad, descuento }: { mensajes: Mensajes; capacidad: number; descuento: number }) {
  const [estado, guardar] = useActionState(sinCaerse(guardarMensajesAction), INICIAL)
  const [textos, setTextos] = useState<Mensajes>(mensajes)
  return (
    // La maqueta (E48): las plantillas en su tarjeta y la agenda en la suya, una al lado de la otra. Un solo formulario:
    // cualquiera de los dos «Guardar» guarda todo.
    <form action={guardar} className="flex flex-wrap items-start gap-6">
      <section aria-labelledby="plantillas" className="flex min-w-0 flex-[2_1_460px] flex-col gap-4.5 rounded-[16px] border border-line-panel bg-bg-raised p-6">
        <h2 className="font-display text-[24px] font-medium" id="plantillas">
          Plantillas para responder
        </h2>
        {MENSAJES.map((m) => (
          <label className="flex flex-col gap-1.5" htmlFor={`mensaje-${m.clave}`} key={m.clave}>
            <span className="text-[14px] font-medium">{m.titulo}</span>
            <textarea
              aria-describedby={`mensaje-${m.clave}-ayuda`}
              className={`${FIELD_CLASS} min-h-24 leading-relaxed`}
              id={`mensaje-${m.clave}`}
              maxLength={1000}
              name={m.clave}
              onChange={(e) => setTextos((t) => ({ ...t, [m.clave]: e.target.value }))}
              placeholder={rellenar(m.porDefecto, EJEMPLO)}
              value={textos[m.clave]}
            />
            <span className="flex justify-between gap-3 text-[13px] text-ink-mute" id={`mensaje-${m.clave}-ayuda`}>
              <span>{m.ayuda} Puedes usar {'{nombre}'}, {'{fecha}'}, {'{importe}'}, {'{plan}'}, {'{enlace}'} y {'{marca}'}.</span>
              <span className="shrink-0 [font-variant-numeric:tabular-nums]">{textos[m.clave].length}/1000</span>
            </span>
          </label>
        ))}
        <div className="flex items-center justify-end gap-3">
          <ActionFeedback state={estado} />
          <SubmitButton pendingLabel="Guardando…">Guardar plantillas</SubmitButton>
        </div>
      </section>

      <section aria-labelledby="agenda" className="flex min-w-0 flex-[1_1_260px] flex-col gap-4 rounded-[16px] border border-line-panel bg-bg-raised p-6">
        <h2 className="font-display text-[24px] font-medium" id="agenda">
          Agenda
        </h2>
        <UnitField defaultValue={String(capacidad)} hint="Más allá, el calendario lo marca lleno." id="capacidad" label="Eventos por día" name="capacidad" required unit="eventos" />
        <UnitField defaultValue={String(descuento)} hint="Lo que recibe quien compra con el código de un cliente." id="descuento" label="Descuento por recomendar" name="descuento" required unit="%" />
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
        </div>
      </section>
    </form>
  )
}

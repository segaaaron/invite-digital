'use client'

import { useActionState, useState } from 'react'
import { guardarMensajesAction, type MensajesState } from '@/app/_acciones/admin/mensajes-actions'
import { MENSAJES, rellenar, type Mensajes } from '../domain/mensajes'
import { SettingsSection, UnitField } from '@/shared/design/ui/panel/ajustes'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { FIELD_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: MensajesState = { status: 'idle' }
/** Lo que se ve en la muestra de cada mensaje: una venta cualquiera. */
const EJEMPLO = { nombre: 'Carla', fecha: 'sáb 14 feb 2027', importe: 'Bs 1.190,00', enlace: 'luxuryatelier.net/es/pedido/ref/7KQ3M9XA', plan: 'Firma 3D', marca: 'Luxury Atelier' }

/**
 * Las plantillas con **su muestra al lado**, rellenada como la verá el cliente: así se escribe
 * sabiendo cómo queda. Y la agenda: cuántos eventos por día se atienden y el descuento que recibe
 * quien compra recomendado.
 */
export function MensajesForm({ mensajes, capacidad, descuento }: { mensajes: Mensajes; capacidad: number; descuento: number }) {
  const [estado, guardar] = useActionState(sinCaerse(guardarMensajesAction), INICIAL)
  const [textos, setTextos] = useState<Mensajes>(mensajes)
  return (
    <form action={guardar} className="flex flex-col">
      <SettingsSection description="El calendario marca un día como lleno y el cotizador avisa al llegar a este número." title="Agenda">
        <div className="grid max-w-[520px] gap-4 min-[560px]:grid-cols-2">
          <UnitField defaultValue={String(capacidad)} id="capacidad" label="Eventos por día" name="capacidad" required unit="eventos" />
          <UnitField defaultValue={String(descuento)} hint="Lo que recibe quien compra con el código de un cliente." id="descuento" label="Descuento por recomendación" name="descuento" required unit="%" />
        </div>
      </SettingsSection>

      <SettingsSection
        description={
          <>
            Lo que se abre escrito en WhatsApp desde Ventas. Se rellenan <code className="font-mono text-[11px]">{'{nombre}'}</code>,{' '}
            <code className="font-mono text-[11px]">{'{fecha}'}</code>, <code className="font-mono text-[11px]">{'{importe}'}</code>,{' '}
            <code className="font-mono text-[11px]">{'{plan}'}</code>, <code className="font-mono text-[11px]">{'{enlace}'}</code> y{' '}
            <code className="font-mono text-[11px]">{'{marca}'}</code>. Vacío vuelve al mensaje de siempre.
          </>
        }
        title="Mensajes al cliente"
      >
        <div className="flex flex-col gap-5">
          {MENSAJES.map((m) => (
            <div className="grid gap-3 min-[1100px]:grid-cols-2" key={m.clave}>
              <label className="flex flex-col gap-1.5" htmlFor={`mensaje-${m.clave}`}>
                <span className="text-[13.5px] text-ink">{m.titulo}</span>
                <span className="text-[12px] text-ink-mute">{m.ayuda}</span>
                <textarea
                  className={`${FIELD_CLASS} mt-1 min-h-24 text-[13px] leading-relaxed`}
                  id={`mensaje-${m.clave}`}
                  maxLength={1000}
                  name={m.clave}
                  onChange={(e) => setTextos((t) => ({ ...t, [m.clave]: e.target.value }))}
                  value={textos[m.clave]}
                />
              </label>
              {/* La muestra: una burbuja de WhatsApp con el mensaje rellenado. */}
              <div aria-label={`Así se lee: ${m.titulo}`} className="flex items-end self-stretch rounded-[18px] bg-[var(--color-plan-from)] p-4 ring-1 ring-line-panel" role="figure">
                <p className="max-w-[92%] rounded-[14px] rounded-bl-[4px] bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-ink shadow-card">
                  {rellenar(textos[m.clave].trim() === '' ? m.porDefecto : textos[m.clave], EJEMPLO)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <div className="sticky bottom-0 z-10 -mx-1 flex items-center gap-3 border-t border-line-panel bg-bg-raised/90 px-1 py-3 backdrop-blur">
        <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
        <ActionFeedback state={estado} />
      </div>
    </form>
  )
}

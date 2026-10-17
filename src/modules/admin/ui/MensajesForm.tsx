'use client'

import { useActionState, useRef, useState } from 'react'
import { guardarMensajesAction, type MensajesState } from '@/app/_acciones/admin/mensajes-actions'
import { MENSAJES, rellenar, type Mensajes } from '../domain/mensajes'
import { UnitField } from '@/shared/design/ui/panel/ajustes'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { FIELD_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { traducir } from '@/shared/i18n/en-ingles'
import { useT } from '@/shared/i18n/idioma-navegador'

const INICIAL: MensajesState = { status: 'idle' }
/** Los datos que se pueden poner, con su nombre para personas: se insertan con un toque, sin escribir llaves (16 oct). */
const DATOS = [
  { clave: '{nombre}', es: 'Nombre', en: 'Name' },
  { clave: '{fecha}', es: 'Fecha', en: 'Date' },
  { clave: '{importe}', es: 'Importe', en: 'Amount' },
  { clave: '{plan}', es: 'Plan', en: 'Plan' },
  { clave: '{enlace}', es: 'Enlace', en: 'Link' },
  { clave: '{marca}', es: 'Marca', en: 'Brand' },
] as const
/** Lo que se ve en la muestra de cada mensaje: una venta cualquiera. */
const EJEMPLO = { nombre: 'Carla', fecha: 'sáb 14 feb 2027', importe: 'Bs 690', enlace: 'luxuryatelier.net/es/pedido/ref/7KQ3M9XA', plan: 'Gala', marca: 'Luxury Atelier' }

/**
 * Las plantillas con **su muestra al lado**, rellenada como la verá el cliente: así se escribe
 * sabiendo cómo queda. Y la agenda: cuántos eventos por día se atienden y el descuento que recibe
 * quien compra recomendado.
 */
export function MensajesForm({ mensajes, capacidad, descuento }: { mensajes: Mensajes; capacidad: number; descuento: number }) {
  const t = useT()
  const [estado, guardar] = useActionState(sinCaerse(guardarMensajesAction), INICIAL)
  const [textos, setTextos] = useState<Mensajes>(mensajes)
  const campos = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const cursores = useRef<Record<string, readonly [number, number]>>({})
  /** Pone el dato donde está el cursor (o al final) y deja el cursor detrás. */
  const insertar = (clave: keyof Mensajes, dato: string) => {
    const campo = campos.current[clave]
    const actual = textos[clave]
    // Donde quedó el cursor la última vez que se tocó el texto; si no se tocó, al final (no al principio).
    const [desde, hasta] = cursores.current[clave] ?? [actual.length, actual.length]
    const nuevo = `${actual.slice(0, desde)}${dato}${actual.slice(hasta)}`.slice(0, 1000)
    setTextos((antes) => ({ ...antes, [clave]: nuevo }))
    cursores.current[clave] = [desde + dato.length, desde + dato.length]
    requestAnimationFrame(() => {
      campo?.focus()
      campo?.setSelectionRange(desde + dato.length, desde + dato.length)
    })
  }
  return (
    // La maqueta (E48): las plantillas en su tarjeta y la agenda en la suya, una al lado de la otra. Un solo formulario:
    // cualquiera de los dos «Guardar» guarda todo.
    <form action={guardar} className="flex flex-wrap items-start gap-6">
      <section aria-labelledby="plantillas" className="flex min-w-0 flex-[2_1_460px] flex-col gap-4.5 rounded-[16px] border border-line-panel bg-bg-raised p-6">
        <h2 className="font-display text-[24px] font-medium" id="plantillas">
          {t('Plantillas para responder', 'Reply templates')}
        </h2>
        {MENSAJES.map((m) => (
          <div className="flex flex-col gap-1.5" key={m.clave}>
            <label className="text-[14px] font-medium" htmlFor={`mensaje-${m.clave}`}>
              {traducir(m.titulo, t)}
            </label>
            <textarea
              ref={(nodo) => {
                campos.current[m.clave] = nodo
              }}
              aria-describedby={`mensaje-${m.clave}-ayuda`}
              className={`${FIELD_CLASS} min-h-24 leading-relaxed`}
              id={`mensaje-${m.clave}`}
              maxLength={1000}
              name={m.clave}
              onChange={(e) => setTextos((antes) => ({ ...antes, [m.clave]: e.target.value }))}
              onSelect={(e) => {
                cursores.current[m.clave] = [e.currentTarget.selectionStart, e.currentTarget.selectionEnd]
              }}
              placeholder={rellenar(m.porDefecto, EJEMPLO)}
              value={textos[m.clave]}
            />
            <span className="flex justify-between gap-3 text-[13px] text-ink-mute" id={`mensaje-${m.clave}-ayuda`}>
              <span>{traducir(m.ayuda, t)}</span>
              <span className="shrink-0 [font-variant-numeric:tabular-nums]">{textos[m.clave].length}/1000</span>
            </span>
            <div aria-label={t('Poner un dato', 'Insert a detail')} className="flex flex-wrap items-center gap-1.5" role="group">
              <span className="text-[13px] text-ink-mute">{t('Poner:', 'Insert:')}</span>
              {DATOS.map((d) => (
                <button
                  className="min-h-11 cursor-pointer rounded-full border border-line-panel-strong bg-bg px-3 text-[13px] text-ink hover:border-gold"
                  key={d.clave}
                  onClick={() => insertar(m.clave, d.clave)}
                  type="button"
                >
                  + {t(d.es, d.en)}
                </button>
              ))}
            </div>
            {/* Cómo le llega, con datos de ejemplo: las llaves no se ven tal cual. */}
            <p className="rounded-[10px] bg-bg px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line text-ink-soft">
              <span className="text-ink-mute">{t('Así le llega: ', 'How it arrives: ')}</span>
              {rellenar(textos[m.clave].trim() === '' ? m.porDefecto : textos[m.clave], EJEMPLO)}
            </p>
          </div>
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

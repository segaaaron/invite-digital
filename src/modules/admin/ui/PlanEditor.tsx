'use client'

import { useActionState, useId } from 'react'
import { Field, FIELD_CLASS, PanelAlert, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import { savePlanAction, type AdminActionState } from '../actions'
import { MAX_FUNCIONES, type TextoPlanLimpio } from '../domain/plan-editable'

const INICIAL: AdminActionState = { status: 'idle' }

export type PlanEditorView = {
  readonly slug: string
  /** Ya formateado para el campo: `690` o `1450,50`. */
  readonly price: string
  readonly priceLabel: string
  readonly maxGuestGroups: number | null
  readonly includesSeating: boolean
  readonly includesRegistry: boolean
  readonly includesCheckin: boolean
  readonly maxDoorPorters: number
  readonly maxCohosts: number | null
  readonly maxHiredPlanners: number | null
  readonly maxGalleryPhotos: number | null
  readonly guestPhotos: boolean
  readonly eventPassword: boolean
  readonly csvImport: boolean
  readonly onlineDays: number
  readonly designChange: string
  readonly plannerSuite: string
  readonly highlighted: boolean
  readonly isActive: boolean
  readonly eventos: number
  readonly es: TextoPlanLimpio | null
  readonly en: TextoPlanLimpio | null
}

const INTERRUPTORES = [
  { name: 'includesSeating', label: 'Mesas y plano' },
  { name: 'includesRegistry', label: 'Mesa de regalos' },
  { name: 'includesCheckin', label: 'Modo puerta y porteros' },
  { name: 'guestPhotos', label: 'Fotos de invitados' },
  { name: 'eventPassword', label: 'Invitación con contraseña' },
  { name: 'csvImport', label: 'Importar lista (CSV)' },
  { name: 'highlighted', label: 'Destacado en la web' },
  { name: 'isActive', label: 'Activo (se vende)' },
] as const

/**
 * Un plan, editable entero. Un formulario por plan y **su propio estado**: guardar uno no
 * pinta el acierto en los otros dos.
 *
 * Los interruptores son `checkbox` nativos con piel de píldora: marcado se envía `on`, y
 * desmarcado no se envía, que es justo lo que lee la acción.
 */
export function PlanEditor({ plan }: { plan: PlanEditorView }) {
  const [estado, guardar, guardando] = useActionState(savePlanAction, INICIAL)
  const id = useId()
  // Tras un error, lo enviado manda sobre lo guardado: React vacía el formulario al acabar la
  // acción y lo devuelve a sus `defaultValue`, así que esos tienen que ser lo que se escribió.
  const enviado = estado.status === 'error' ? estado.valores : undefined
  const txt = (nombre: string, guardado: string) => (enviado ? (enviado[nombre] ?? '') : guardado)
  const chk = (nombre: string, guardado: boolean) => (enviado ? enviado[nombre] === 'on' : guardado)

  return (
    // `key` remonta tras un error: las casillas no toman un `defaultChecked` nuevo al volver a
    // pintar, y un interruptor cambiado volvía a lo guardado.
    <form key={enviado ? JSON.stringify(enviado) : plan.slug} action={guardar} className="flex flex-col gap-5">
      <input name="slug" type="hidden" value={plan.slug} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] tracking-[0.35em] text-ink-mute uppercase">{plan.slug}</p>
          <p className="mt-1 font-display text-[30px] leading-none text-ink">{plan.es?.name ?? plan.slug}</p>
          <p className="mt-2 font-display text-[22px] text-ink-soft [font-variant-numeric:lining-nums]">{plan.priceLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill tone={plan.isActive ? 'ok' : 'no'}>{plan.isActive ? 'Se vende' : 'Retirado'}</Pill>
          <Pill tone="pending">
            {plan.eventos} evento{plan.eventos === 1 ? '' : 's'}
          </Pill>
        </div>
      </div>

      <div className="grid gap-4 min-[560px]:grid-cols-3">
        <Field htmlFor={`${id}-precio`} label="Precio (Bs)">
          <input className={FIELD_CLASS} defaultValue={txt('price', plan.price)} id={`${id}-precio`} inputMode="decimal" name="price" required />
        </Field>
        <Field htmlFor={`${id}-tope`} label="Tope de grupos · vacío = sin límite">
          <input
            className={FIELD_CLASS}
            defaultValue={txt('maxGuestGroups', plan.maxGuestGroups === null ? '' : String(plan.maxGuestGroups))}
            id={`${id}-tope`}
            inputMode="numeric"
            name="maxGuestGroups"
            placeholder="Sin límite"
          />
        </Field>
        <Field htmlFor={`${id}-porteros`} label="Porteros · 0 = sin puerta">
          <input
            className={FIELD_CLASS}
            defaultValue={txt('maxDoorPorters', String(plan.maxDoorPorters))}
            id={`${id}-porteros`}
            inputMode="numeric"
            name="maxDoorPorters"
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 min-[560px]:grid-cols-2">
        <Field htmlFor={`${id}-coanfitriones`} label="Co-anfitriones · vacío = sin límite">
          <input
            className={FIELD_CLASS}
            defaultValue={txt('maxCohosts', plan.maxCohosts === null ? '' : String(plan.maxCohosts))}
            id={`${id}-coanfitriones`}
            inputMode="numeric"
            name="maxCohosts"
            placeholder="Sin límite"
          />
        </Field>
        <Field htmlFor={`${id}-planners`} label="Planners contratados · 0 = ninguno">
          <input
            className={FIELD_CLASS}
            defaultValue={txt('maxHiredPlanners', plan.maxHiredPlanners === null ? '' : String(plan.maxHiredPlanners))}
            id={`${id}-planners`}
            inputMode="numeric"
            name="maxHiredPlanners"
            placeholder="Sin límite"
          />
        </Field>
      </div>

      <div className="grid gap-4 min-[560px]:grid-cols-3">
        <Field htmlFor={`${id}-fotos`} label="Fotos del evento · vacío = sin límite">
          <input
            className={FIELD_CLASS}
            defaultValue={txt('maxGalleryPhotos', plan.maxGalleryPhotos === null ? '' : String(plan.maxGalleryPhotos))}
            id={`${id}-fotos`}
            inputMode="numeric"
            name="maxGalleryPhotos"
            placeholder="Sin límite"
          />
        </Field>
        <Field htmlFor={`${id}-dias`} label="Días en línea tras el evento">
          <input className={FIELD_CLASS} defaultValue={txt('onlineDays', String(plan.onlineDays))} id={`${id}-dias`} inputMode="numeric" name="onlineDays" required />
        </Field>
        <Field htmlFor={`${id}-modelo`} label="Cambiar de modelo (misma fiesta)">
          <select className={FIELD_CLASS} defaultValue={txt('designChange', plan.designChange)} id={`${id}-modelo`} name="designChange">
            <option value="ninguno">Nunca</option>
            <option value="antes_de_repartir">Hasta repartir los enlaces</option>
            <option value="siempre">Siempre</option>
          </select>
        </Field>
        <Field htmlFor={`${id}-suite`} label="Planner">
          <select className={FIELD_CLASS} defaultValue={txt('plannerSuite', plan.plannerSuite)} id={`${id}-suite`} name="plannerSuite">
            <option value="esencial">Esencial · tareas y presupuesto</option>
            <option value="completo">Completo · + proveedores, cronograma y cortejo</option>
            <option value="total">Total · + Día D y enlaces para proveedores</option>
          </select>
        </Field>
      </div>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">Incluye</legend>
        {INTERRUPTORES.map((interruptor) => (
          <label
            key={interruptor.name}
            className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-3.5 py-2 text-[12px] text-ink-soft transition-colors has-checked:border-ink has-checked:bg-ink has-checked:text-white"
          >
            <input className="accent-current" defaultChecked={chk(interruptor.name, plan[interruptor.name])} name={interruptor.name} type="checkbox" />
            {interruptor.label}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-5 min-[900px]:grid-cols-2">
        {(['es', 'en'] as const).map((locale) => {
          const t = plan[locale]
          return (
            <fieldset key={locale} className="flex flex-col gap-3 rounded-[14px] border border-line-panel bg-bg-top/60 p-4">
              <legend className="px-1 font-mono text-[9px] tracking-[0.3em] text-ink-mute uppercase">
                {locale === 'es' ? 'Español' : 'Inglés'}
              </legend>
              <Field htmlFor={`${id}-${locale}-nombre`} label="Nombre">
                <input className={FIELD_CLASS} defaultValue={txt(`${locale}.name`, t?.name ?? '')} id={`${id}-${locale}-nombre`} name={`${locale}.name`} required />
              </Field>
              <Field htmlFor={`${id}-${locale}-lema`} label="Lema">
                <input className={FIELD_CLASS} defaultValue={txt(`${locale}.tagline`, t?.tagline ?? '')} id={`${id}-${locale}-lema`} name={`${locale}.tagline`} />
              </Field>
              <Field htmlFor={`${id}-${locale}-desc`} label="Descripción">
                <textarea
                  className={`${FIELD_CLASS} min-h-[70px] resize-y`}
                  defaultValue={txt(`${locale}.description`, t?.description ?? '')}
                  id={`${id}-${locale}-desc`}
                  name={`${locale}.description`}
                />
              </Field>
              <Field htmlFor={`${id}-${locale}-func`} label={`Funciones · una por línea, hasta ${MAX_FUNCIONES}`}>
                <textarea
                  className={`${FIELD_CLASS} min-h-[140px] resize-y text-[13px] leading-[1.7]`}
                  defaultValue={txt(`${locale}.features`, t?.features.join('\n') ?? '')}
                  id={`${id}-${locale}-func`}
                  name={`${locale}.features`}
                  required
                />
              </Field>
            </fieldset>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PanelButton disabled={guardando} type="submit" variant="primary">
          {guardando ? 'Guardando…' : 'Guardar plan'}
        </PanelButton>
        {plan.eventos > 0 ? (
          <span className="text-[12px] text-ink-mute">
            Cambiar el tope o las funciones afecta ya a sus {plan.eventos} evento{plan.eventos === 1 ? '' : 's'}.
          </span>
        ) : null}
      </div>

      {estado.status === 'error' ? <PanelAlert tone="error">{estado.message}</PanelAlert> : null}
      {estado.status === 'success' && estado.message !== undefined ? <PanelAlert tone="ok">{estado.message}</PanelAlert> : null}
    </form>
  )
}

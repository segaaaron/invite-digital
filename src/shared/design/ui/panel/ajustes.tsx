import type { ReactNode } from 'react'
import { FIELD_CLASS, LABEL_CLASS } from './PanelKit'

/**
 * Las piezas de una pantalla de ajustes del panel.
 *
 * Siguen el patrón de las pantallas de ajustes de Shopify Polaris: cada grupo lleva a la
 * izquierda **qué es y para qué sirve**, y a la derecha sus controles. Antes los ajustes eran
 * una rejilla de campos iguales con la explicación metida en la etiqueta («vacío = sin
 * límite»), y no se distinguía qué iba con qué.
 */
export function SettingsSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line-panel py-6 first:border-t-0 first:pt-0 min-[900px]:grid-cols-[260px_1fr] min-[900px]:gap-10">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[15px] font-medium text-ink">{title}</h3>
        {description ? <p className="text-[12.5px] leading-[1.6] text-ink-mute">{description}</p> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}

/**
 * Un interruptor: una casilla nativa con piel de interruptor. Marcado se envía `on` y
 * desmarcado no se envía, que es lo que ya leen las acciones. `role="switch"` hace que un
 * lector de pantalla diga «activado» en vez de «marcado».
 */
export function SwitchRow({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string
  label: string
  description?: string
  defaultChecked: boolean
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[12px] px-1 py-2.5 hover:bg-bg-top/60">
      <span className="flex flex-col gap-0.5">
        <span className="text-[13.5px] text-ink">{label}</span>
        {description ? <span className="text-[12px] leading-[1.5] text-ink-mute">{description}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
        <input className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0" defaultChecked={defaultChecked} name={name} role="switch" type="checkbox" />
        <span
          aria-hidden
          className="h-6 w-11 rounded-full bg-line-panel-strong transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold"
        />
        <span
          aria-hidden
          className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 motion-reduce:transition-none"
        />
      </span>
    </label>
  )
}

/** Un número con su unidad al lado («40 grupos», «Bs 690»), y la ayuda debajo, no en la etiqueta. */
export function UnitField({
  id,
  label,
  name,
  defaultValue,
  unit,
  prefix,
  hint,
  placeholder,
  required = false,
  decimal = false,
}: {
  id: string
  label: string
  name: string
  defaultValue: string
  unit?: string
  prefix?: string
  hint?: string
  placeholder?: string
  required?: boolean
  decimal?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label className={LABEL_CLASS} htmlFor={id}>
        {label}
      </label>
      <div className="relative flex items-center">
        {prefix ? <span className="pointer-events-none absolute left-4 text-[14px] text-ink-mute">{prefix}</span> : null}
        <input
          aria-describedby={hint ? `${id}-ayuda` : undefined}
          className={`${FIELD_CLASS} [font-variant-numeric:tabular-nums] ${prefix ? 'pl-10' : ''} ${unit ? 'pr-20' : ''}`}
          defaultValue={defaultValue}
          id={id}
          inputMode={decimal ? 'decimal' : 'numeric'}
          name={name}
          placeholder={placeholder}
          required={required}
        />
        {unit ? <span className="pointer-events-none absolute right-4 text-[12px] text-ink-mute">{unit}</span> : null}
      </div>
      {hint ? (
        <p className="text-[12px] leading-[1.5] text-ink-mute" id={`${id}-ayuda`}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Elegir una opción entre pocas, cada una con lo que implica. Radios nativos con piel de tarjeta. */
export function ChoiceCards({
  legend,
  name,
  defaultValue,
  options,
}: {
  legend: string
  name: string
  defaultValue: string
  options: ReadonlyArray<{ value: string; label: string; description: string }>
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${LABEL_CLASS} mb-2`}>{legend}</legend>
      <div className="grid gap-2 min-[700px]:grid-cols-3">
        {options.map((o) => (
          <label
            className="flex cursor-pointer flex-col gap-1 rounded-[14px] border border-line-panel-strong bg-white p-3.5 transition-colors has-checked:border-ink has-checked:bg-bg-top has-focus-visible:outline-2 has-focus-visible:outline-gold"
            key={o.value}
          >
            <span className="flex items-center gap-2 text-[13.5px] text-ink">
              <input className="accent-ink" defaultChecked={o.value === defaultValue} name={name} type="radio" value={o.value} />
              {o.label}
            </span>
            <span className="pl-5 text-[12px] leading-[1.5] text-ink-mute">{o.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

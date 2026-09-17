'use client'

import { useState } from 'react'
import { CampoFechaHora } from './CampoFechaHora'
import { ClockIcon } from '@/shared/design/ui/icons'
import { FIELD_CLASS } from './PanelKit'
import { SelectorDeFecha } from './SelectorDeFecha'

/**
 * El valor que el formulario envía, sin que se vea. Un `hidden` no se valida y un `readOnly`
 * tampoco: con `required`, este campo invisible es el que hace que el navegador pida la fecha.
 */
function Valor({ name, value, required }: { name: string; value: string; required?: boolean | undefined }) {
  return <input aria-hidden className="pointer-events-none absolute bottom-0 left-4 h-px w-px opacity-0" name={name} onChange={() => {}} required={required} tabIndex={-1} value={value} />
}

/**
 * Un día, con el calendario del panel, para un formulario que envía por `name`. El valor es
 * `YYYY-MM-DD`, como el `<input type="date">` que sustituye —azul, en inglés y «mm/dd/yyyy»—.
 */
export function CampoFecha({
  id,
  name,
  defaultValue = '',
  required,
  valor,
  onChange,
  hoy,
}: {
  id: string
  name: string
  defaultValue?: string
  required?: boolean
  /** Controlado, cuando la pantalla necesita el valor mientras se escribe. */
  valor?: string
  onChange?: (valor: string) => void
  hoy?: string
}) {
  const [propio, setPropio] = useState(defaultValue)
  const actual = valor ?? propio
  return (
    <div className="relative">
      <SelectorDeFecha
        {...(hoy === undefined ? {} : { hoy })}
        id={id}
        onChange={(v) => {
          setPropio(v)
          onChange?.(v)
        }}
        valor={actual}
      />
      <Valor name={name} required={required} value={actual} />
    </div>
  )
}

/** Las horas del día, de cuarto en cuarto. */
const HORAS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`)

/** Una hora, en un desplegable con la piel del panel. Una hora suelta ya guardada se conserva. */
export function CampoHora({ id, name, defaultValue = '', required }: { id: string; name: string; defaultValue?: string; required?: boolean }) {
  const inicial = defaultValue.slice(0, 5)
  const opciones = inicial !== '' && !HORAS.includes(inicial) ? [inicial, ...HORAS] : HORAS
  return (
    <div className="relative">
      <ClockIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-mute" />
      <select className={`${FIELD_CLASS} cursor-pointer pl-10`} defaultValue={inicial} id={id} name={name} required={required}>
        <option value="">Hora</option>
        {opciones.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Día y hora juntos (`YYYY-MM-DDTHH:mm`), para un formulario que envía por `name`. */
export function CampoFechaYHora({ id, name, defaultValue = '', required }: { id: string; name: string; defaultValue?: string; required?: boolean }) {
  const [valor, setValor] = useState(defaultValue.slice(0, 16))
  return (
    <div className="relative">
      <CampoFechaHora id={id} onChange={setValor} valor={valor} />
      <Valor name={name} required={required} value={valor} />
    </div>
  )
}

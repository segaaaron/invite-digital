'use client'

import { useId } from 'react'
import { ClockIcon } from '@/shared/design/ui/icons'
import { FIELD_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { SelectorDeFecha } from '@/shared/design/ui/panel/SelectorDeFecha'

/** Las horas de una fiesta, de media en media: nadie cita a las 19:07. */
const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

/**
 * Fecha y hora, cada una por su lado.
 *
 * La fecha, con el calendario del panel (`SelectorDeFecha`): el del navegador pintaba
 * «10/17/2026» en azul y en inglés. La hora, en medias horas, que es como se cita a una
 * fiesta. El valor que viaja sigue siendo `YYYY-MM-DDTHH:mm`, lo que el dominio ya guarda.
 */
export function CampoFechaHora({ id, valor, onChange }: { id: string; valor: string; onChange: (valor: string) => void }) {
  const horaId = useId()
  const [fecha = '', hora = ''] = valor.split('T')
  const componer = (f: string, h: string) => (f === '' ? '' : `${f}T${h === '' ? '19:00' : h.slice(0, 5)}`)

  // Una hora escrita a mano que no caiga en la media —«19:15» de una importación— se ofrece
  // igual: descartarla cambiaría la invitación por el mero hecho de abrir el formulario.
  const horaActual = hora === '' ? '' : hora.slice(0, 5)
  const opciones = horaActual !== '' && !HORAS.includes(horaActual) ? [horaActual, ...HORAS] : HORAS

  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      <div className="min-w-[220px] flex-1">
        <SelectorDeFecha id={id} onChange={(f) => onChange(componer(f, horaActual))} valor={fecha} />
      </div>
      <label className="sr-only" htmlFor={horaId}>
        Hora
      </label>
      <div className="relative w-[128px] shrink-0">
        <ClockIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-mute" />
        <select
          className={`${FIELD_CLASS} cursor-pointer pl-10`}
          id={horaId}
          onChange={(e) => onChange(componer(fecha, e.target.value))}
          value={horaActual}
        >
          <option value="">Hora</option>
          {opciones.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

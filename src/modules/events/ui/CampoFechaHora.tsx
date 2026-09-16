'use client'

import { useId } from 'react'
import { FIELD_CLASS } from '@/shared/design/ui/panel/PanelKit'

/** Las horas de una fiesta, de media en media: nadie cita a las 19:07. */
const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

const FECHA_LARGA = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/**
 * Fecha y hora, cada una por su lado.
 *
 * Un `datetime-local` deja la pantalla en manos del navegador: Chrome pinta su calendario azul
 * con los meses en inglés y una rueda de minutos, que no es ni la piel del panel ni el idioma
 * del proyecto. Aquí la fecha es un `date` —el calendario del sistema sigue siendo el más
 * cómodo en un teléfono— y la hora un desplegable de medias horas, que es como se cita a una
 * boda. Debajo se lee la fecha escrita con todas sus letras, para cazar el clásico
 * mes-por-día.
 *
 * El valor que viaja sigue siendo `YYYY-MM-DDTHH:mm`, lo que el dominio ya guarda.
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
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap gap-2">
        <input
          className={`${FIELD_CLASS} min-w-[150px] flex-1`}
          id={id}
          onChange={(e) => onChange(componer(e.target.value, horaActual))}
          type="date"
          value={fecha}
        />
        <label className="sr-only" htmlFor={horaId}>
          Hora
        </label>
        <select className={`${FIELD_CLASS} w-[116px] shrink-0`} id={horaId} onChange={(e) => onChange(componer(fecha, e.target.value))} value={horaActual}>
          <option value="">Hora</option>
          {opciones.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>
      {fecha === '' ? null : (
        <p className="text-[12px] text-ink-mute first-letter:uppercase">
          {FECHA_LARGA.format(new Date(`${fecha}T00:00:00Z`))}
          {horaActual === '' ? '' : ` · ${horaActual} h`}
        </p>
      )}
    </div>
  )
}

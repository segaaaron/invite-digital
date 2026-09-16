'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon } from '@/shared/design/ui/icons'
import { FIELD_CLASS } from './PanelKit'

const FECHA_LARGA = new Intl.DateTimeFormat('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const MES = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const DIAS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']

/** `YYYY-MM-DD` a medianoche UTC: el día del calendario, sin la zona del servidor ni del navegador. */
const aFecha = (iso: string): Date => new Date(`${iso}T00:00:00Z`)
const aIso = (fecha: Date): string => fecha.toISOString().slice(0, 10)
const sumarDias = (iso: string, dias: number): string => {
  const f = aFecha(iso)
  f.setUTCDate(f.getUTCDate() + dias)
  return aIso(f)
}
const primeroDelMes = (iso: string): string => `${iso.slice(0, 7)}-01`
const sumarMeses = (mes: string, n: number): string => {
  const f = aFecha(mes)
  f.setUTCMonth(f.getUTCMonth() + n)
  return aIso(f)
}

/** Las seis semanas del mes, de lunes a domingo, con los días de los meses vecinos a los lados. */
const semanasDe = (mes: string): string[][] => {
  const hueco = (aFecha(mes).getUTCDay() + 6) % 7
  const inicio = sumarDias(mes, -hueco)
  return Array.from({ length: 6 }, (_, s) => Array.from({ length: 7 }, (_, d) => sumarDias(inicio, s * 7 + d)))
}

/**
 * Elegir un día con la piel del panel.
 *
 * El `<input type="date">` lo pinta el navegador: en Chrome, un recuadro azul con los meses en
 * inglés y «10/17/2026» en el campo, que se lee mes por día. Aquí el campo dice la fecha con
 * todas sus letras —«sábado, 17 de octubre de 2026»— y el calendario va en español, empieza
 * en lunes y se mueve con las flechas del teclado.
 *
 * El valor que entra y sale es `YYYY-MM-DD`, como el del `date` nativo.
 */
export function SelectorDeFecha({
  id,
  valor,
  onChange,
  hoy,
}: {
  id: string
  valor: string
  onChange: (valor: string) => void
  /** El día de hoy, `YYYY-MM-DD`. Entra por prop para que las pruebas no dependan del reloj. */
  hoy?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const hoyIso = hoy ?? aIso(new Date())
  const [enFoco, setEnFoco] = useState(valor === '' ? hoyIso : valor)
  const contenedor = useRef<HTMLDivElement>(null)
  const rejilla = useRef<HTMLTableElement>(null)

  const abrir = () => {
    setEnFoco(valor === '' ? hoyIso : valor)
    setAbierto(true)
  }

  // Al abrir y al moverse con el teclado, el foco va al día señalado.
  useEffect(() => {
    if (!abierto) return
    rejilla.current?.querySelector<HTMLButtonElement>(`[data-dia="${enFoco}"]`)?.focus()
  }, [abierto, enFoco])

  // Un clic fuera cierra, como cualquier desplegable.
  useEffect(() => {
    if (!abierto) return
    const fuera = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [abierto])

  const elegir = (dia: string) => {
    onChange(dia)
    setAbierto(false)
    document.getElementById(id)?.focus()
  }

  const teclado = (evento: KeyboardEvent) => {
    const pasos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (evento.key === 'Escape') {
      evento.preventDefault()
      setAbierto(false)
      document.getElementById(id)?.focus()
      return
    }
    const paso = pasos[evento.key]
    if (paso !== undefined) {
      evento.preventDefault()
      setEnFoco((actual) => sumarDias(actual, paso))
    }
  }

  const mes = primeroDelMes(enFoco)
  const texto = valor === '' ? 'Elige el día' : FECHA_LARGA.format(aFecha(valor))

  return (
    <div className="relative min-w-0" ref={contenedor}>
      <button
        aria-describedby={`${id}-texto`}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        className={`${FIELD_CLASS} flex cursor-pointer items-center gap-3 text-left`}
        id={id}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        type="button"
      >
        <CalendarIcon className="size-4 shrink-0 text-ink-mute" />
        <span className={`truncate first-letter:uppercase ${valor === '' ? 'text-ink-mute' : ''}`} id={`${id}-texto`}>
          {texto}
        </span>
      </button>

      {abierto ? (
        <div
          aria-label="Elegir fecha"
          className="absolute top-[calc(100%+6px)] left-0 z-30 w-[300px] rounded-[16px] border border-line-panel bg-white p-4 shadow-float"
          onKeyDown={teclado}
          role="dialog"
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              aria-label="Mes anterior"
              className="grid size-8 cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-bg-top hover:text-ink"
              onClick={() => setEnFoco(sumarMeses(mes, -1))}
              type="button"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
            <p aria-live="polite" className="font-display text-[17px] text-ink first-letter:uppercase">
              {MES.format(aFecha(mes))}
            </p>
            <button
              aria-label="Mes siguiente"
              className="grid size-8 cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-bg-top hover:text-ink"
              onClick={() => setEnFoco(sumarMeses(mes, 1))}
              type="button"
            >
              <ArrowRightIcon className="size-4" />
            </button>
          </div>

          <table className="w-full border-collapse" ref={rejilla} role="grid">
            <thead>
              <tr>
                {DIAS.map((dia) => (
                  <th className="pb-1.5 text-center text-[11px] font-normal text-ink-mute" key={dia} scope="col">
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {semanasDe(mes).map((semana) => (
                <tr key={semana[0]}>
                  {semana.map((dia) => {
                    const delMes = dia.slice(0, 7) === mes.slice(0, 7)
                    const elegido = dia === valor
                    const esHoy = dia === hoyIso
                    return (
                      <td className="p-0.5 text-center" key={dia}>
                        <button
                          aria-label={FECHA_LARGA.format(aFecha(dia))}
                          aria-pressed={elegido}
                          className={`size-9 cursor-pointer rounded-full text-[13px] tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-ink ${
                            elegido
                              ? 'bg-ink text-white'
                              : delMes
                                ? 'text-ink hover:bg-bg-top'
                                : 'text-ink-mute/60 hover:bg-bg-top'
                          } ${esHoy && !elegido ? 'ring-1 ring-gold' : ''}`}
                          data-dia={dia}
                          onClick={() => elegir(dia)}
                          tabIndex={dia === enFoco ? 0 : -1}
                          type="button"
                        >
                          {Number(dia.slice(8))}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex justify-between border-t border-line-panel pt-3 text-[12px]">
            <button className="cursor-pointer text-ink-soft underline-offset-4 hover:underline" onClick={() => elegir(hoyIso)} type="button">
              Hoy
            </button>
            {valor === '' ? null : (
              <button className="cursor-pointer text-ink-soft underline-offset-4 hover:underline" onClick={() => elegir('')} type="button">
                Quitar fecha
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

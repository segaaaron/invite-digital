'use client'

import { type CSSProperties, useEffect, useState } from 'react'
import { type CountdownParts, countdownFrom, pad } from './time'

const UNIDADES = ['days', 'hours', 'mins', 'secs'] as const

export type CountdownUnit = (typeof UNIDADES)[number]

/**
 * El reloj de la cuenta atrás.
 *
 * El cálculo vive en `countdownFrom`, que recibe el instante y se prueba sin tocar el
 * reloj del sistema. Aquí solo está lo que no se puede probar sin un reloj: el intervalo.
 *
 * El primer valor se calcula también en el servidor y se corrige al montar. Sin eso, el
 * marcado del servidor y el del navegador difieren en el segundo y React lo canta por
 * consola en cada invitación abierta.
 */
export function useCountdown(targetISO: string): CountdownParts {
  const [partes, setPartes] = useState<CountdownParts>(() => countdownFrom(targetISO, new Date()))

  useEffect(() => {
    const tic = () => setPartes(countdownFrom(targetISO, new Date()))
    tic()
    const identificador = setInterval(tic, 1000)
    return () => clearInterval(identificador)
  }, [targetISO])

  return partes
}

type Props = {
  readonly targetISO: string
  /** El rótulo de cada casilla, en el idioma del evento. Del diccionario, nunca del código. */
  readonly labels: Readonly<Record<CountdownUnit, string>>
  readonly cellStyle?: CSSProperties
  readonly valueStyle?: CSSProperties
  readonly labelStyle?: CSSProperties
  readonly rowStyle?: CSSProperties
}

/**
 * Las cuatro casillas.
 *
 * Recibe **datos y estilos, nunca una función**: un componente cliente al que un
 * componente de servidor le pasa un hijo como función revienta la página entera en tiempo
 * de ejecución —«Functions are not valid as a child of Client Components»— y el typecheck
 * no dice nada. Ya pasó con el conmutador de precios.
 *
 * Los diseños cuya casilla no cabe en estos cuatro estilos —los que meten una imagen de
 * reloj entre medias, o parten la rejilla— montan su propio bloque con `useCountdown`.
 *
 * **Con movimiento reducido sigue corriendo.** No animar es respetar la preferencia;
 * congelar el contador es mentir sobre cuánto falta, y quien pidió menos movimiento no
 * pidió menos información.
 */
export function Countdown({ targetISO, labels, cellStyle, valueStyle, labelStyle, rowStyle }: Props) {
  const partes = useCountdown(targetISO)

  return (
    <div style={rowStyle}>
      {UNIDADES.map((unidad) => (
        <div key={unidad} style={cellStyle}>
          <div style={valueStyle}>{pad(partes[unidad])}</div>
          <div style={labelStyle}>{labels[unidad]}</div>
        </div>
      ))}
    </div>
  )
}

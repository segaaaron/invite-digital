'use client'

import { useCountdown } from '../kit/Countdown'
import { pad } from '../kit/time'

type Props = {
  readonly targetISO: string
  readonly labels: { readonly days: string; readonly hours: string; readonly mins: string; readonly secs: string }
  /** El aro lleno. */
  readonly aro: string
  /** El aro de fondo, el que se va llenando. */
  readonly aroFondo: string
  readonly cifra: string
  readonly rotulo: string
  readonly serif: string
  readonly mono: string
  /** El rótulo de cada aro, cuando no es el de «Noche Estrellada» (10 px, 0,25 em). */
  readonly rotuloEstilo?: { readonly size: number; readonly tracking: string; readonly opacidad: number }
}

/** El radio del aro, y su longitud, como en la maqueta (84 × 84, radio 34). */
const RADIO = 34
const VUELTA = 2 * Math.PI * RADIO

/**
 * La cuenta atrás de «Noche Estrellada»: cuatro aros que se llenan con lo que falta.
 *
 * Cada aro se llena contra su tope —60 días, 24 horas, 60 minutos, 60 segundos—, que es
 * como lo cuenta la maqueta: con más de sesenta días el de los días va lleno.
 */
export function CuentaConAros({ targetISO, labels, aro, aroFondo, cifra, rotulo, serif, mono, rotuloEstilo }: Props) {
  const partes = useCountdown(targetISO)
  const casillas = [
    { clave: 'days', rotulo: labels.days, valor: partes.days, tope: 60 },
    { clave: 'hours', rotulo: labels.hours, valor: partes.hours, tope: 24 },
    { clave: 'mins', rotulo: labels.mins, valor: partes.mins, tope: 60 },
    { clave: 'secs', rotulo: labels.secs, valor: partes.secs, tope: 60 },
  ] as const

  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 14 }}>
      {casillas.map((casilla) => {
        const lleno = Math.min(casilla.valor / casilla.tope, 1)
        return (
          <div key={casilla.clave} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg aria-hidden height="84" viewBox="0 0 84 84" width="84">
              <circle cx="42" cy="42" fill="none" r={RADIO} stroke={aroFondo} strokeWidth="3" />
              <circle
                cx="42"
                cy="42"
                fill="none"
                r={RADIO}
                stroke={aro}
                strokeDasharray={VUELTA}
                strokeDashoffset={VUELTA * (1 - lleno)}
                strokeLinecap="round"
                strokeWidth="3"
                suppressHydrationWarning
                transform="rotate(-90 42 42)"
              />
            </svg>
            {/* La cifra va fuera del SVG para que se lea como texto. */}
            <div
              style={{ marginTop: -84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontSize: 24, fontWeight: 700, color: cifra }}
              suppressHydrationWarning
            >
              {pad(casilla.valor)}
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: rotuloEstilo?.size ?? 10,
                letterSpacing: rotuloEstilo?.tracking ?? '0.25em',
                opacity: rotuloEstilo?.opacidad,
                marginTop: 6,
                color: rotulo,
              }}
            >
              {casilla.rotulo}
            </div>
          </div>
        )
      })}
    </div>
  )
}

'use client'

import Image from 'next/image'
import { useState } from 'react'

type Props = {
  imageAlt: string
  luxeLabel: string
  luxe: readonly string[]
  traditionalLabel: string
  traditional: readonly string[]
  sliderLabel: string
}

/**
 * El comparador de la maqueta: la suite del atelier al fondo y, encima, dos paneles que
 * se reparten el ancho —«Tradicional» a la izquierda, «Luxury Atelier» a la derecha— con el
 * deslizador en medio.
 *
 * Los dos se recortan contra la misma posición, así que la invitación de verdad asoma
 * justo por donde uno acaba y el otro empieza. Un solo panel tapando al otro escondía la
 * pieza, que es lo que se está comparando.
 *
 * El control es un `input[type=range]` de verdad, no un div con eventos de puntero: así
 * funciona con teclado y lo anuncia un lector de pantalla.
 */
export function CompareSlider({ imageAlt, luxeLabel, luxe, traditionalLabel, traditional, sliderLabel }: Props) {
  const [posicion, setPosicion] = useState(50)

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] shadow-[var(--shadow-lift)]">
      <div className="relative aspect-16/9 min-h-[460px]">
        <Image
          alt={imageAlt}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 1180px, 100vw"
          src="/site/diferencia/suite.avif"
        />

        <div
          className="absolute inset-0 flex flex-col justify-center gap-4 bg-bg-raised p-10"
          data-testid="panel-tradicional"
          style={{ clipPath: `inset(0 ${100 - posicion}% 0 0)` }}
        >
          <p className="font-display text-[30px] font-light text-ink-mute">{traditionalLabel}</p>
          <ul className="flex max-w-[38ch] flex-col gap-3">
            {traditional.map((item) => (
              <li key={item} className="text-[14px] leading-[1.6] text-ink-soft">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="absolute inset-0 flex flex-col items-end justify-center gap-4 bg-linear-to-l from-ink/92 via-ink/70 to-transparent p-10 text-right"
          data-testid="panel-luxe"
          style={{ clipPath: `inset(0 0 0 ${posicion}%)` }}
        >
          <p className="font-display text-[30px] font-light text-gold-light">{luxeLabel}</p>
          <ul className="flex max-w-[38ch] flex-col gap-3">
            {luxe.map((item) => (
              <li key={item} className="text-[14px] leading-[1.6] text-bg-sunken">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px bg-gold/70"
          style={{ left: `${posicion}%` }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-linear-to-br from-gold-light to-gold-deep font-mono text-[10px] tracking-[0.2em] text-white shadow-[var(--shadow-float)]"
          style={{ left: `${posicion}%` }}
        >
          VS
        </span>
      </div>

      <input
        aria-label={sliderLabel}
        className="absolute inset-x-0 top-1/2 h-12 w-full -translate-y-1/2 cursor-ew-resize appearance-none bg-transparent [&::-moz-range-thumb]:h-12 [&::-moz-range-thumb]:w-12 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-12 [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
        max={100}
        min={0}
        onChange={(e) => setPosicion(Number(e.target.value))}
        type="range"
        value={posicion}
      />
    </div>
  )
}

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
 * El comparador de la maqueta: la suite del atelier al fondo y el panel «Tradicional»
 * encima, recortado por un deslizador.
 *
 * El control es un `input[type=range]` de verdad, no un div con eventos de puntero: así
 * funciona con teclado y lo anuncia un lector de pantalla. Un comparador que solo entiende
 * el arrastre deja fuera a quien no puede arrastrar.
 */
export function CompareSlider({ imageAlt, luxeLabel, luxe, traditionalLabel, traditional, sliderLabel }: Props) {
  const [posicion, setPosicion] = useState(50)

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] shadow-[var(--shadow-lift)]">
      <div className="relative aspect-16/10 min-h-[420px]">
        <Image alt={imageAlt} className="object-cover" fill sizes="(min-width: 1024px) 1180px, 100vw" src="/site/diferencia/suite.avif" />

        <div className="absolute inset-0 flex items-end bg-linear-to-t from-ink/85 via-ink/35 to-transparent p-8">
          <div className="max-w-[46ch] text-bg-raised">
            <p className="font-display text-[26px] text-gold-light">{luxeLabel}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {luxe.map((item) => (
                <li key={item} className="flex gap-3 text-[14px] leading-[1.6] text-bg-sunken">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* El panel tradicional se lee por la derecha del corte, que es el lado que queda
            a la vista: alineado a la izquierda quedaba recortado y la columna salía vacía. */}
        <div
          className="absolute inset-0 flex items-end justify-end bg-bg-sunken p-8"
          data-testid="panel-tradicional"
          style={{ clipPath: `inset(0 0 0 ${posicion}%)` }}
        >
          <div className="max-w-[46ch] text-right">
            <p className="font-display text-[26px] text-ink-mute">{traditionalLabel}</p>
            <ul className="mt-4 flex flex-col gap-2.5">
              {traditional.map((item) => (
                <li key={item} className="flex justify-end gap-3 text-[14px] leading-[1.6] text-ink-mute">
                  {item}
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-mute/50" />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px bg-gold/80"
          style={{ left: `${posicion}%` }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold bg-bg-raised font-mono text-[10px] tracking-[0.2em] text-ink"
          style={{ left: `${posicion}%` }}
        >
          VS
        </span>
      </div>

      <input
        aria-label={sliderLabel}
        className="absolute inset-x-0 top-1/2 h-11 w-full -translate-y-1/2 cursor-ew-resize appearance-none bg-transparent [&::-moz-range-thumb]:h-11 [&::-moz-range-thumb]:w-11 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-11 [&::-webkit-slider-thumb]:w-11 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
        max={100}
        min={0}
        onChange={(e) => setPosicion(Number(e.target.value))}
        type="range"
        value={posicion}
      />
    </div>
  )
}

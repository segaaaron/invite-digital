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

        {/* Lo tradicional se enseña como lo que es: una imagen plana reenviada por chat, en gris
            y con la marca de la plantilla encima. El texto solo no contaba la diferencia. */}
        <div
          className="absolute inset-0 flex items-center bg-bg-sunken bg-[radial-gradient(var(--color-line-panel-strong)_1px,transparent_1px)] bg-size-[14px_14px] p-10"
          data-testid="panel-tradicional"
          style={{ clipPath: `inset(0 ${100 - posicion}% 0 0)` }}
        >
          <div className="flex w-full items-center gap-8 md:w-1/2 md:pr-10">
            <div className="flex flex-1 flex-col gap-4">
              <p className="font-display text-[30px] font-light text-ink-mute">{traditionalLabel}</p>
              <ul className="flex max-w-[38ch] flex-col gap-3">
                {traditional.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] leading-[1.6] text-ink-soft">
                    <svg
                      aria-hidden="true"
                      className="mt-[5px] shrink-0 text-ink-mute"
                      fill="none"
                      height="12"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.6"
                      viewBox="0 0 24 24"
                      width="12"
                    >
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div aria-hidden className="hidden w-[150px] shrink-0 -rotate-3 rounded-[14px] bg-white p-1.5 shadow-[var(--shadow-lift)] lg:block">
              <div className="relative flex aspect-4/5 flex-col items-center justify-center gap-2 rounded-[10px] bg-bg-sunken px-4 grayscale">
                <span className="mb-1 size-7 rounded-full border border-line-panel-strong" />
                <span className="h-2 w-20 rounded-full bg-line-panel-strong" />
                <span className="h-1.5 w-14 rounded-full bg-line-panel-strong" />
                <span className="mt-2 h-1.5 w-16 rounded-full bg-line-panel" />
                <span className="h-1.5 w-12 rounded-full bg-line-panel" />
                <span className="absolute right-2 bottom-2 rounded-sm bg-line-panel-strong px-1.5 py-0.5 text-[7px] text-ink-mute uppercase">
                  plantilla.app
                </span>
              </div>
              <div className="flex items-center justify-between px-1 pt-1.5 text-[9px] text-ink-mute">
                <span>IMG-2048.jpg</span>
                <span>10:42 ✓✓</span>
              </div>
            </div>
          </div>
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
        className="absolute inset-x-0 top-1/2 h-12 w-full -translate-y-1/2 cursor-ew-resize appearance-none border-0 bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent[&::-moz-range-thumb]:h-12 [&::-moz-range-thumb]:w-12 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-12 [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
        max={100}
        min={0}
        onChange={(e) => setPosicion(Number(e.target.value))}
        type="range"
        value={posicion}
      />
    </div>
  )
}

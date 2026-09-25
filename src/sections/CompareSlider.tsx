'use client'

import Image from '@/shared/design/ui/ImagenConCarga'
import { useState } from 'react'

type Props = {
  imageAlt: string
  luxeLabel: string
  luxe: readonly string[]
  traditionalLabel: string
  traditional: readonly string[]
  sliderLabel: string
  phoneCta: string
  phoneCaption: string
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
export function CompareSlider({ imageAlt, luxeLabel, luxe, traditionalLabel, traditional, sliderLabel, phoneCta, phoneCaption }: Props) {
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

        {/* Lo tradicional se enseña como lo que es: una tarjeta impresa, quieta y gris, con el
            logotipo de la plantilla. El texto solo no contaba la diferencia. */}
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

            {/* Lo de siempre: una tarjeta impresa, quieta. Papel color hueso, tinta gris y el
                logotipo de la imprenta abajo; nada que tocar, nada que confirmar. */}
            <div aria-hidden className="hidden w-[168px] shrink-0 -rotate-2 rounded-[4px] border border-line-panel-strong bg-bg-top p-4 shadow-[var(--shadow-card)] lg:block">
              <div className="flex aspect-[5/7] flex-col items-center justify-center gap-2.5 border border-line-panel px-4 text-center grayscale">
                <span className="h-px w-8 bg-line-panel-strong" />
                <span className="h-2.5 w-24 rounded-full bg-line-panel-strong" />
                <span className="h-2.5 w-16 rounded-full bg-line-panel-strong" />
                <span className="mt-2 h-1.5 w-20 rounded-full bg-line-panel" />
                <span className="h-1.5 w-14 rounded-full bg-line-panel" />
                <span className="mt-auto mb-2 rounded-sm border border-line-panel px-1.5 py-0.5 text-[7px] tracking-[0.2em] text-ink-mute uppercase">
                  plantilla.app
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Y lo nuestro se enseña, no se cuenta: la invitación de verdad abierta en un teléfono,
            con el enlace y el botón de confirmar que recibe cada familia. */}
        <div
          className="absolute inset-0 flex items-center justify-end gap-8 bg-linear-to-l from-ink/94 via-ink/78 to-transparent p-10 text-right"
          data-testid="panel-luxe"
          style={{ clipPath: `inset(0 0 0 ${posicion}%)` }}
        >
          <div aria-hidden className="hidden w-[176px] shrink-0 rotate-2 rounded-[26px] border border-gold/40 bg-ink p-2 shadow-[var(--shadow-float)] lg:block">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[20px] bg-bg-sunken">
              <Image alt="" className="object-cover object-top" fill sizes="176px" src="/templates/boda-bot.avif" />
              <span className="absolute inset-x-2 bottom-2 rounded-full bg-gold px-3 py-1.5 text-center text-[9px] tracking-[0.18em] text-shell-deep uppercase">
                {phoneCta}
              </span>
            </div>
            <p className="pt-2 pb-1 text-center font-mono text-[8px] tracking-[0.2em] text-gold-light uppercase">{phoneCaption}</p>
          </div>
          <div className="flex flex-col items-end gap-4">
            <p className="font-display text-[30px] font-light text-gold-light">{luxeLabel}</p>
            <ul className="flex max-w-[34ch] flex-col gap-3">
              {luxe.map((item) => (
                <li className="flex items-start justify-end gap-3 text-[14px] leading-[1.6] text-bg-sunken" key={item}>
                  {item}
                  <svg
                    aria-hidden="true"
                    className="mt-[5px] shrink-0 text-gold-light"
                    fill="none"
                    height="12"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                    width="12"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </li>
              ))}
            </ul>
          </div>
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
        className="absolute inset-x-0 top-1/2 h-12 w-full -translate-y-1/2 cursor-ew-resize appearance-none border-0 bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-thumb]:h-12 [&::-moz-range-thumb]:w-12 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-webkit-slider-thumb]:h-12 [&::-webkit-slider-thumb]:w-12 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
        max={100}
        min={0}
        onChange={(e) => setPosicion(Number(e.target.value))}
        type="range"
        value={posicion}
      />
    </div>
  )
}

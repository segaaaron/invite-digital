'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon } from '@/shared/design/ui/icons'
import type { Dictionary } from '@/shared/i18n/dictionaries'

export type CarouselSlide = {
  readonly key: string
  readonly tag: string
  readonly name: string
  readonly alt: string
  readonly src: string
}

type Props = { slides: readonly CarouselSlide[]; dictionary: Dictionary }

/** Cuántas escenas se ven a cada lado antes de apartarse de la vista. */
const VISIBLES = 3

/**
 * La geometría del carrusel de la maqueta: escenario con perspectiva, la escena elegida
 * de frente y las vecinas giradas hacia dentro y empujadas al fondo.
 *
 * Se calcula por posición relativa —no por índice absoluto— para que el movimiento sea el
 * mismo estés donde estés de la lista.
 */
function posicionar(offset: number) {
  const distancia = Math.abs(offset)
  const fuera = distancia > VISIBLES

  return {
    transform: `translateX(${offset * 58}%) translateZ(${-distancia * 190}px) rotateY(${offset * -38}deg) scale(${1 - distancia * 0.05})`,
    opacity: fuera ? 0 : 1 - distancia * 0.18,
    zIndex: 100 - distancia,
    pointerEvents: (distancia === 0 ? 'auto' : 'none') as 'auto' | 'none',
  }
}

export function CollectionsCarousel({ slides, dictionary }: Props) {
  // Arranca por el medio de la lista: así se ven escenas a los dos lados desde el primer
  // vistazo, que es lo que hace legible un carrusel con perspectiva. Empezando por el
  // borde, la mitad izquierda del escenario queda vacía.
  const [index, setIndex] = useState(() => Math.floor(Math.max(slides.length - 1, 0) / 2))
  const last = Math.max(slides.length - 1, 0)
  const active = slides[index]
  const reduceMotion = useReducedMotion()

  const go = (delta: number) => setIndex((current) => Math.min(Math.max(current + delta, 0), last))

  return (
    <div className="relative">
      <div
        className="relative h-[clamp(430px,64vw,560px)] [perspective:1700px]"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1)
          if (e.key === 'ArrowLeft') go(-1)
        }}
        aria-label="Colecciones"
        role="region"
        tabIndex={0}
      >
        <motion.ul
          className="absolute inset-0 [transform-style:preserve-3d]"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={(_, info) => go(info.offset.x < -60 ? 1 : info.offset.x > 60 ? -1 : 0)}
        >
          {slides.map((slide, i) => {
            const estilo = posicionar(i - index)
            return (
              <li
                aria-current={i === index ? 'true' : undefined}
                className="absolute top-1/2 left-1/2 -mt-[220px] -ml-[165px] h-[440px] w-[330px] overflow-hidden rounded-[24px] bg-bg-sunken shadow-[var(--shadow-lift)] transition-[transform,opacity] duration-700 ease-[cubic-bezier(.19,1,.22,1)] motion-reduce:transition-none"
                key={slide.key}
                role="group"
                style={{ ...estilo, transitionDuration: reduceMotion ? '0ms' : undefined }}
              >
                <button
                  className="block h-full w-full text-left"
                  onClick={() => setIndex(i)}
                  tabIndex={i === index ? 0 : -1}
                  type="button"
                >
                  <Image
                    alt={slide.alt}
                    className="object-cover"
                    fill
                    priority={i < 2}
                    sizes="330px"
                    src={slide.src}
                  />
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-linear-to-t from-ink/85 to-transparent px-6 pt-14 pb-6">
                    <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-gold-light uppercase">
                      {slide.tag}
                    </span>
                    <span className="font-display text-[24px] text-bg-raised">{slide.name}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </motion.ul>
      </div>

      <button
        aria-label={dictionary.collections.previous}
        className="absolute top-1/2 left-0 z-[200] grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg-raised/80 text-ink backdrop-blur-md transition-colors hover:border-gold disabled:opacity-30"
        disabled={index === 0}
        onClick={() => go(-1)}
        type="button"
      >
        <ArrowLeftIcon />
      </button>
      <button
        aria-label={dictionary.collections.next}
        className="absolute top-1/2 right-0 z-[200] grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg-raised/80 text-ink backdrop-blur-md transition-colors hover:border-gold disabled:opacity-30"
        disabled={index === last}
        onClick={() => go(1)}
        type="button"
      >
        <ArrowRightIcon />
      </button>

      <p aria-live="polite" className="mt-6 text-center text-[12px] text-ink-mute">
        {dictionary.collections.hint}
        {active ? ` · ${active.name}` : ''}
      </p>
    </div>
  )
}

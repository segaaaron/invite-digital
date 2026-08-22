'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import Image from 'next/image'
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

/**
 * El carrusel de escenas de la maqueta: fotografía a sangre y, debajo, la celebración y
 * el nombre de la escena. Antes enseñaba las plantillas del catálogo, que es lo que la
 * maqueta pone en «Modelos», no aquí.
 */
export function CollectionsCarousel({ slides, dictionary }: Props) {
  const [index, setIndex] = useState(0)
  const last = Math.max(slides.length - 1, 0)
  const active = slides[index]
  const reduceMotion = useReducedMotion()

  const go = (delta: number) => setIndex((current) => Math.min(Math.max(current + delta, 0), last))

  return (
    <div className="relative">
      <motion.ul
        animate={{ x: `calc(${-index} * (280px + 24px))` }}
        className="flex gap-6"
        drag="x"
        dragConstraints={{ left: -last * 304, right: 0 }}
        dragElastic={0.08}
        onDragEnd={(_, info) => go(info.offset.x < -60 ? 1 : info.offset.x > 60 ? -1 : 0)}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 20 }}
      >
        {slides.map((slide, i) => (
          <li aria-current={i === index ? 'true' : undefined} className="w-[280px] shrink-0" key={slide.key} role="group">
            <figure className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-bg-raised shadow-[var(--shadow-lift)]">
              <div className="relative aspect-3/4">
                <Image alt={slide.alt} className="object-cover" fill sizes="280px" src={slide.src} />
              </div>
              <figcaption className="flex flex-col gap-1 px-5 py-4">
                <span className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">
                  {slide.tag}
                </span>
                <span className="font-display text-[19px] text-ink">{slide.name}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </motion.ul>

      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-line)] px-5 py-2 text-[11px] tracking-[var(--tracking-luxe)] uppercase disabled:opacity-40"
          disabled={index === 0}
          onClick={() => go(-1)}
          type="button"
        >
          <ArrowLeftIcon />
          {dictionary.collections.previous}
        </button>
        <span aria-live="polite" className="text-[11px] text-ink-mute">
          {active ? active.name : dictionary.collections.hint}
        </span>
        <button
          className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--color-line)] px-5 py-2 text-[11px] tracking-[var(--tracking-luxe)] uppercase disabled:opacity-40"
          disabled={index === last}
          onClick={() => go(1)}
          type="button"
        >
          {dictionary.collections.next}
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  )
}

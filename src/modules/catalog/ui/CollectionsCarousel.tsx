'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
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

  /**
   * Avanza solo cada seis segundos. Un carrusel quieto parece una imagen: nadie sabe que
   * hay quince escenas más detrás. **Se para en cuanto el visitante toca algo** —flecha,
   * punto, tarjeta, arrastre o teclado— y no vuelve a arrancar: seguir moviéndose debajo de
   * quien está mirando una escena es lo que hace odiosos a los carruseles (NN/g).
   *
   * No se mueve con `prefers-reduced-motion`, ni con la pestaña de fondo, ni mientras el
   * puntero está encima o el foco dentro.
   */
  const [auto, setAuto] = useState(true)
  const parar = () => setAuto(false)
  const encima = useRef(false)
  useEffect(() => {
    if (!auto || reduceMotion || slides.length < 2) return
    const id = window.setInterval(() => {
      if (encima.current || document.hidden) return
      setIndex((actual) => (actual >= last ? 0 : actual + 1))
    }, 6000)
    return () => window.clearInterval(id)
  }, [auto, reduceMotion, slides.length, last])

  return (
    <div className="relative" onFocusCapture={() => (encima.current = true)} onMouseEnter={() => (encima.current = true)} onMouseLeave={() => (encima.current = false)}>
      <div
        // `clip` propio, además del de la raíz: las tarjetas se colocan en absoluto desde
        // el centro con `-ml-[165px]`, así que en un teléfono de 390 sobresalen hasta
        // −400 px y empujaban el ancho del documento. Recortar aquí las detiene donde
        // nacen, en vez de dejar que la raíz tape el problema.
        className="relative h-[clamp(430px,64vw,560px)] [perspective:1700px] [overflow-x:clip]"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
          parar()
          go(e.key === 'ArrowRight' ? 1 : -1)
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
          onDragEnd={(_, info) => {
            parar()
            go(info.offset.x < -60 ? 1 : info.offset.x > 60 ? -1 : 0)
          }}
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
                  // `relative` es requisito del `fill` de la imagen: `next/image` lo
                  // resuelve contra su **padre directo**, y este botón era `static`, así
                  // que el ancestro posicionado acababa siendo el `<li>` y la consola
                  // avisaba en cada montaje. No mueve nada: el botón ocupa exactamente el
                  // `<li>` (`h-full w-full`), que es contra lo que ya se resolvía.
                  className="relative block h-full w-full text-left"
                  onClick={() => {
                    parar()
                    setIndex(i)
                  }}
                  tabIndex={i === index ? 0 : -1}
                  type="button"
                >
                  <Image
                    alt={slide.alt}
                    className="object-cover"
                    fill
                    priority={i < 2}
                    // Las tarjetas miden 330 px CSS: en pantalla Retina piden 660, y con
                    // `sizes="330px"` Next servía una variante de 384 que se veía blanda.
                    quality={82}
                    sizes="660px"
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
        onClick={() => {
          parar()
          go(-1)
        }}
        type="button"
      >
        <ArrowLeftIcon />
      </button>
      <button
        aria-label={dictionary.collections.next}
        className="absolute top-1/2 right-0 z-[200] grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg-raised/80 text-ink backdrop-blur-md transition-colors hover:border-gold disabled:opacity-30"
        disabled={index === last}
        onClick={() => {
          parar()
          go(1)
        }}
        type="button"
      >
        <ArrowRightIcon />
      </button>

      {/* Los puntos de la maqueta: dicen cuántas escenas hay y en cuál estás, que es lo
          único que un carrusel con perspectiva no cuenta por sí solo. El activo se
          alarga en vez de solo cambiar de color: la forma se ve sin distinguir tonos. */}
      <div className="mt-8.5 flex justify-center gap-2.5">
        {slides.map((slide, i) => (
          <button
            aria-current={i === index ? 'true' : undefined}
            aria-label={`Ir a la escena ${i + 1}: ${slide.name}`}
            className={`h-2 rounded-full transition-all duration-500 ${
              i === index ? 'w-7 bg-linear-to-r from-gold-deep to-gold-light' : 'w-2 bg-ink-mute/30 hover:bg-ink-mute/60'
            }`}
            key={slide.key}
            onClick={() => {
              parar()
              setIndex(i)
            }}
            type="button"
          />
        ))}
      </div>

      <p aria-live="polite" className="mt-5 text-center text-[12px] text-ink-mute">
        {dictionary.collections.hint}
        {active ? ` · ${active.name}` : ''}
      </p>
    </div>
  )
}

'use client'

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { prefiereMenosMovimiento } from './motion'

type Props = {
  readonly children: ReactNode
  /** Milisegundos de espera antes de entrar, para escalonar bloques contiguos. */
  readonly delay?: number
  /** Cuánto sube al entrar, en píxeles. */
  readonly y?: number
  /** Escala de partida. 1 es sin escalado. */
  readonly scale?: number
  readonly duration?: number
  readonly style?: CSSProperties
  readonly className?: string
}

/**
 * La entrada de cada bloque de la invitación: aparece al entrar en pantalla.
 *
 * Es la pieza que usan **los dieciséis diseños**, así que su regla de movimiento reducido
 * decide si la invitación se lee o no para quien pidió menos animación:
 *
 * **Con movimiento reducido, el contenido está visible desde el primer render.** Un
 * `Reveal` que arranca en `opacity: 0` esperando un observador que no se llega a montar
 * deja la invitación entera en blanco, sin un solo error en consola. La decisión se toma
 * en el inicializador de `useState`, **no en un `useEffect`**: un efecto pintaría un
 * fotograma oculto antes de corregirse, que es un parpadeo en cada bloque de la página.
 *
 * El contenido va siempre en el marcado, se vea o no: es lo que leen los buscadores y los
 * lectores de pantalla.
 */
export function Reveal({ children, delay = 0, y = 24, scale = 1, duration = 800, style, className }: Props) {
  const [reducido] = useState(prefiereMenosMovimiento)
  const [visible, setVisible] = useState(reducido)
  const nodo = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reducido || visible) return
    const elemento = nodo.current
    if (elemento === null) return

    // `IntersectionObserver` no existe en jsdom ni en navegadores muy viejos. Sin él, el
    // bloque se enseña: no animar es un defecto aceptable; no verse, no.
    //
    // Va en un fotograma aparte y no en el cuerpo del efecto porque un `setState` síncrono
    // dentro de un efecto encadena renders —lo marca el lint— y porque en el servidor
    // tampoco existe: decidirlo en el estado inicial haría que el marcado del servidor y
    // el del navegador no coincidieran.
    if (typeof IntersectionObserver === 'undefined') {
      const fotograma = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(fotograma)
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setVisible(true)
          observador.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [reducido, visible])

  const transformaciones = [visible ? null : `translateY(${y}px)`, visible || scale === 1 ? null : `scale(${scale})`]
    .filter((t): t is string => t !== null)
    .join(' ')

  return (
    <div
      className={className}
      ref={nodo}
      style={{
        opacity: visible ? 1 : 0,
        transform: transformaciones.length === 0 ? undefined : transformaciones,
        transition: reducido ? undefined : `opacity ${duration}ms ease, transform ${duration}ms cubic-bezier(.19,1,.22,1)`,
        transitionDelay: reducido ? undefined : `${delay}ms`,
        willChange: reducido || visible ? undefined : 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

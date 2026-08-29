'use client'

import type { CSSProperties } from 'react'

/**
 * Congruencial con semilla fija. Los sesenta trozos se calculan **una vez, al cargar el
 * módulo**: este componente se monta tras una acción del servidor que revalida el árbol, y
 * con posiciones nuevas en cada render el estallido se recolocaría a mitad de vuelo.
 */
const TROZOS = (() => {
  let estado = 20260829
  const aleatorio = (): number => {
    estado = (estado * 1664525 + 1013904223) % 4294967296
    return estado / 4294967296
  }
  return Array.from({ length: 60 }, (_, indice) => {
    const angulo = (indice / 60) * Math.PI * 2
    const distancia = 80 + aleatorio() * 140
    return {
      x: Math.cos(angulo) * distancia,
      y: Math.sin(angulo) * distancia - 40,
      rot: aleatorio() * 720,
      delay: aleatorio() * 0.1,
      sz: 4 + aleatorio() * 6,
      tono: indice % 3,
    }
  })
})()

const TONOS = ['var(--color-gold)', 'var(--color-ink)', 'var(--color-gold-light)']

/**
 * El estallido de confeti al confirmar la asistencia.
 *
 * La maqueta lo dispara al enviar el RSVP y era lo único que quedaba sin portar de su
 * animación: el invitado confirmaba y no pasaba nada. Es la única celebración que tiene la
 * invitación, y dura menos de dos segundos.
 *
 * **El color sale del diseño**, no de aquí: `--color-gold`, `--color-ink` y `--color-line`
 * son los que la invitación redefine con su paleta, así que el confeti de la boda botánica
 * es verde salvia y el de «Gala Real», oro sobre guinda. Un color escrito aquí sería el
 * mismo rosa y cian en los dieciséis.
 *
 * Las posiciones salen de un generador con semilla, no de `Math.random`: este componente se
 * monta tras una acción del servidor que **revalida el árbol**, y con posiciones nuevas en
 * cada render el estallido se recolocaría a mitad de vuelo.
 *
 * Con `prefers-reduced-motion` no se pinta. Sesenta trocitos parados en el aire no son una
 * celebración, son una imagen rota.
 */
export function ConfettiBurst({ active }: { readonly active: boolean }) {
  if (!active) return null

  return (
    <span
      aria-hidden
      className="motion-reduce:hidden"
      style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none', zIndex: 100 }}
    >
      {TROZOS.map((trozo, indice) => (
        <span
          key={indice}
          style={
            {
              position: 'absolute',
              left: 0,
              top: 0,
              width: trozo.sz,
              height: trozo.sz * 0.4,
              background: TONOS[trozo.tono],
              animation: `theme-confettiFly 1.4s cubic-bezier(.2,.6,.2,1) ${trozo.delay}s forwards`,
              '--tx': `${trozo.x}px`,
              '--ty': `${trozo.y}px`,
              '--rot': `${trozo.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}

'use client'

import Image from '@/shared/design/ui/ImagenQueAparece'
import { useEffect, useRef } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'
import { Reveal } from '../kit/Reveal'
import { PALETA as P } from './esencia.palette'

/** El contenedor que de verdad se desplaza: el marco del teléfono, o la ventana si no hay. */
function quienDesplaza(nodo: HTMLElement): HTMLElement | null {
  for (let padre = nodo.parentElement; padre !== null; padre = padre.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(padre).overflowY)) return padre
  }
  return null
}

/**
 * La fotografía a sangre con la frase encima que la maqueta V4 pone tras el mensaje
 * (`EsenciaParallax`): la foto se mueve más despacio que la página. Lo mueve el desplazamiento,
 * no un reloj; con «reducir movimiento» se queda quieta.
 */
export function ParalajeDeEsencia({ src, frase }: { readonly src: string; readonly frase: string }) {
  const caja = useRef<HTMLDivElement>(null)
  const foto = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const nodo = caja.current
    if (nodo === null || prefiereMenosMovimiento()) return
    const raiz = quienDesplaza(nodo)
    const destino: HTMLElement | Window = raiz ?? window
    const mover = () => {
      const r = nodo.getBoundingClientRect()
      const arriba = raiz === null ? 0 : raiz.getBoundingClientRect().top
      const alto = raiz === null ? window.innerHeight : raiz.clientHeight
      const desvio = r.top - arriba + r.height / 2 - alto / 2
      // Topado al 20 % de margen que tiene la foto por arriba y por abajo: pasado, asomaba un hueco gris.
      const dy = Math.max(-0.19 * r.height, Math.min(0.19 * r.height, -desvio * 0.18))
      if (foto.current !== null) foto.current.style.transform = `translateY(${dy}px)`
    }
    mover()
    destino.addEventListener('scroll', mover, { passive: true })
    return () => destino.removeEventListener('scroll', mover)
  }, [])

  return (
    <div ref={caja} style={{ position: 'relative', width: '100%', height: 380, overflow: 'hidden', margin: '24px 0' }}>
      <div ref={foto} style={{ position: 'absolute', left: 0, top: '-20%', width: '100%', height: '140%', willChange: 'transform' }}>
        <Image alt="" aria-hidden fill sizes="480px" src={src} style={{ objectFit: 'cover' }} />
      </div>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: P.veloFoto }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
        <Reveal>
          <p style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 300, fontSize: 32, lineHeight: 1.25, color: P.blanco, textShadow: '0 2px 14px rgba(0,0,0,0.25)' }}>{frase}</p>
        </Reveal>
      </div>
    </div>
  )
}

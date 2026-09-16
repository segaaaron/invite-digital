'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { type AvisoDeSeccion, EVENTO_SECCION, buscarEnInvitacion, piezaQueContiene } from './seguir-seccion'

/**
 * El teléfono de la vista previa, que va solo a la sección que se está editando.
 *
 * Al abrir «Recepción» en el editor, la invitación baja hasta donde pinta la recepción y la
 * enmarca un instante: así se ve dónde cae cada cambio sin buscarlo. La portada tapa la
 * invitación entera —es un botón a pantalla completa, en los dieciséis diseños—, así que
 * para cualquier otra sección se abre primero, como haría el invitado. «Portada y nombres»
 * vuelve arriba.
 */
export function MarcoQueSigue({ children }: { children: ReactNode }) {
  const marco = useRef<HTMLDivElement>(null)
  // Cuando la sección aún no sale en la invitación —está vacía—, se dice en vez de no hacer nada.
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | undefined

    const ir = (evento: Event) => {
      const nodo = marco.current
      if (nodo === null) return
      const { seccion, textos } = (evento as CustomEvent<AvisoDeSeccion>).detail
      clearTimeout(espera)
      setAviso(null)

      if (seccion === 'hero') {
        nodo.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // El estilo en línea se serializa sin espacios —«position:fixed»—: se mira el calculado.
      const portada = [...nodo.querySelectorAll('button')].find((boton) => getComputedStyle(boton).position === 'fixed')
      portada?.click()

      // La portada se abre con su animación y lo de debajo aparece al quitarse: se busca después.
      espera = setTimeout(
        () => {
          const hallado = buscarEnInvitacion(nodo, textos)
          const destino = hallado === null ? null : piezaQueContiene(hallado, nodo)
          if (destino === null) {
            setAviso('Esta sección todavía no sale en tu invitación: escríbela y guarda.')
            espera = setTimeout(() => setAviso(null), 3500)
            return
          }
          const caja = destino.getBoundingClientRect()
          const base = nodo.getBoundingClientRect()
          const arriba = nodo.scrollTop + caja.top - base.top
          nodo.scrollTo({ top: Math.max(0, arriba - nodo.clientHeight * 0.3), behavior: 'smooth' })
          resaltar(nodo, arriba, caja.left - base.left, caja.width, caja.height)
        },
        portada === null ? 0 : 700,
      )
    }

    window.addEventListener(EVENTO_SECCION, ir)
    return () => {
      window.removeEventListener(EVENTO_SECCION, ir)
      clearTimeout(espera)
    }
  }, [])

  return (
    <div className="relative h-full">
      <div
        className="theme-phone-frame"
        ref={marco}
        style={{ height: '100%', boxShadow: '0 0 0 1px var(--color-line-panel), 0 18px 50px -20px rgb(0 0 0 / 0.35)' }}
      >
        {children}
      </div>
      {aviso === null ? null : (
        <p
          className="absolute inset-x-4 top-4 z-10 rounded-[12px] bg-ink/90 px-4 py-3 text-center text-[12.5px] leading-[1.5] text-white shadow-float"
          role="status"
        >
          {aviso}
        </p>
      )}
    </div>
  )
}

/** Un marco dorado que aparece sobre lo encontrado y se desvanece. No toca la invitación. */
function resaltar(marco: HTMLElement, arriba: number, izquierda: number, ancho: number, alto: number) {
  const holgura = 10
  const aro = document.createElement('div')
  aro.setAttribute('aria-hidden', 'true')
  Object.assign(aro.style, {
    position: 'absolute',
    top: `${arriba - holgura}px`,
    left: `${Math.max(4, izquierda - holgura)}px`,
    width: `${Math.min(marco.clientWidth - 8, ancho + holgura * 2)}px`,
    height: `${alto + holgura * 2}px`,
    border: '2px solid var(--color-gold)',
    borderRadius: '12px',
    boxShadow: '0 0 0 4px color-mix(in srgb, var(--color-gold) 25%, transparent)',
    pointerEvents: 'none',
    zIndex: '60',
  })
  marco.appendChild(aro)
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const animacion = aro.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], {
    duration: reducido ? 1200 : 1800,
    easing: 'ease-out',
  })
  animacion.onfinish = () => aro.remove()
}

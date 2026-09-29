'use client'

import { useEffect } from 'react'

/** Lo más que se espera a las imágenes de una portada: pasado esto, se enseña igual (nunca se queda cargando). */
const ESPERA_MAXIMA_MS = 8000

/** Quita la marca cuando todas las imágenes de la portada han llegado (o fallado), o pasado el tope. */
function esperar(portada: HTMLElement): void {
  if (portada.dataset.esperando === '1') return
  portada.dataset.esperando = '1'
  const listo = () => {
    portada.removeAttribute('data-cargando')
    delete portada.dataset.esperando
  }
  const pendientes = [...portada.querySelectorAll('img')].filter((img) => !img.complete)
  if (pendientes.length === 0) return listo()
  let faltan = pendientes.length
  // Un temporizador sin red: es el tope de la espera, no un sondeo.
  const tope = window.setTimeout(listo, ESPERA_MAXIMA_MS)
  const una = () => {
    faltan -= 1
    if (faltan > 0) return
    window.clearTimeout(tope)
    listo()
  }
  for (const img of pendientes) {
    // Las perezosas no se piden mientras la portada las tapa: que se pidan ya.
    if (img.loading === 'lazy') img.loading = 'eager'
    img.addEventListener('load', una, { once: true })
    img.addEventListener('error', una, { once: true })
  }
}

/**
 * **La portada aparece entera, no a medias** (29 de septiembre). Cada portada de los diseños llega del servidor
 * con `data-cargando` —se ve su fondo con un indicador, `keyframes.css`— y esto quita la marca cuando sus
 * imágenes han llegado. Vigila también las portadas que aparecen después (la vista previa del panel se vuelve a
 * pintar al guardar). Un solo montaje por página, en el layout.
 */
export function PortadasQueEsperan() {
  useEffect(() => {
    const revisar = () => document.querySelectorAll<HTMLElement>('[data-portada][data-cargando]').forEach(esperar)
    revisar()
    const observador = new MutationObserver(revisar)
    observador.observe(document.body, { childList: true, subtree: true })
    return () => observador.disconnect()
  }, [])
  return null
}

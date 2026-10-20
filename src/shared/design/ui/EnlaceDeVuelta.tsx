'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

/**
 * La salida de una pantalla sin carcasa: **vuelve de donde se vino**, no a un sitio fijo.
 *
 * La ✕ del escaparate llevaba siempre a Colecciones, así que quien abría un modelo desde
 * XV Años o desde Bodas salía a otra página que no había pedido. Un `href` fijo no puede
 * saberlo: la misma pantalla se abre desde cinco sitios.
 *
 * `history.back()` sí lo sabe, pero solo cuando lo anterior es nuestro: si se llegó desde
 * Google o escribiendo la dirección, volver atrás sacaría del sitio. Por eso el `href`
 * sigue ahí —es el destino de verdad del enlace, y el que usa «abrir en otra pestaña»— y
 * solo se cambia por el paso atrás cuando el navegador dice que venimos de casa.
 */
export function EnlaceDeVuelta({ onClick, ...resto }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...resto}
      onClick={(evento) => {
        onClick?.(evento)
        if (evento.defaultPrevented) return
        if (!document.referrer.startsWith(`${window.location.origin}/`)) return
        // Y que haya atrás de verdad: en una pestaña nueva abierta desde una página nuestra, el referrer
        // existe pero el historial está vacío, así que cortar el enlace dejaba la ✕ sin hacer nada.
        if (window.history.length <= 1) return
        evento.preventDefault()
        window.history.back()
      }}
    />
  )
}

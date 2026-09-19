'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  /** El color de debajo, para el instante en que la imagen todavía no está. */
  readonly bg: string
  readonly accent: string
  /** El arte de portada del diseño: la etiqueta de cervecería, con su texto ya rotulado. */
  readonly bgAsset: string
  readonly openLabel: string
}

/**
 * La portada de «Cervecería Vintage»: la ilustración a sangre, a pantalla completa, y nada
 * más. Es la de la maqueta, y es literal —`IntroCover` con `hideText`—.
 *
 * **No lleva texto encima, ni fotografía del cliente, ni rótulo de entrada.** El arte ya
 * dice «CELEBRAMOS · MIGUEL · MI CUMPLEAÑOS · La vida se mide en buenos momentos · te
 * espero» y llega hasta los cuatro bordes: cualquier cosa escrita encima lo tapa o lo
 * repite. Quien navega con teclado o lector de pantalla lo abre por el `aria-label`.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>`: con un div, quien navega
 * con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function CumpleBeerCover({ bg, accent, bgAsset, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

  return (
    <button
      aria-label={openLabel}
      data-portada=""
      onClick={() => setAbierta(true)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        width: '100%',
        overflow: 'hidden',
        background: bg,
        color: accent,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />
    </button>
  )
}

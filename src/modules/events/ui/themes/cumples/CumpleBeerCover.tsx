'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  /** El color de debajo, para el instante en que la imagen todavía no está. */
  readonly bg: string
  readonly accent: string
  /** El arte de portada del diseño: la etiqueta de cervecería con el nombre ya rotulado. */
  readonly bgAsset: string
  /** La fotografía de portada que subió el cliente, cuando la subió. */
  readonly foto?: string | undefined
  /** «MI CUMPLEAÑOS» y el nombre: solo se escriben sobre la fotografía del cliente. */
  readonly label: string
  readonly name: string
  /** «INGRESA A MI INVITACIÓN»: solo se escribe sobre la fotografía del cliente. */
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de «Cervecería Vintage»: la imagen a sangre, a pantalla completa, y nada más.
 *
 * Es la de la maqueta —`IntroCover` con `hideText`—, y el motivo está en la imagen: el arte
 * del diseño **ya lleva rotulado** «CELEBRAMOS · MIGUEL · MI CUMPLEAÑOS» sobre la etiqueta
 * de cervecería. Escribir encima otro nombre lo pintaría dos veces.
 *
 * **Con la fotografía del cliente sí se escribe.** Una foto suya no trae rótulo ninguno, y
 * sin él la portada no dice de quién es la fiesta. Es la misma regla de las portadas de XV
 * con fotografía, aplicada al revés: el texto aparece cuando el arte deja de traerlo.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>`: con un div, quien navega
 * con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function CumpleBeerCover({ bg, accent, bgAsset, foto, label, name, hint, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

  const sombra = '0 2px 10px rgba(0,0,0,.75)'

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
      {foto === undefined ? (
        <Image alt="" aria-hidden fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element -- la sirve /media/[id], que
           no pasa por el optimizador de Next: lleva la puerta de contraseña del evento. */
        <img
          alt=""
          aria-hidden
          src={foto}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {foto === undefined ? null : (
        <>
          {/* El velo solo va con la fotografía del cliente: sobre el arte del diseño no hay
              texto que separar del fondo, y ensuciaría la etiqueta. */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(28,20,12,0.55) 0%, rgba(28,20,12,0.12) 45%, rgba(28,20,12,0.75) 100%)',
            }}
          />
          <span style={{ position: 'absolute', left: 0, right: 0, top: '38%', textAlign: 'center', padding: '0 24px' }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 11,
                letterSpacing: '0.45em',
                color: accent,
                textShadow: sombra,
              }}
            >
              {label}
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 14,
                fontFamily: 'var(--font-great-vibes)',
                fontSize: 62,
                lineHeight: 1.05,
                color: accent,
                textShadow: sombra,
              }}
            >
              {name}
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 22,
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 10,
                letterSpacing: '0.3em',
                color: accent,
                textShadow: sombra,
              }}
            >
              {hint}
            </span>
          </span>
        </>
      )}

      {/* Sin rótulo de entrada, y es la maqueta: el arte ya dice «CELEBRAMOS · MIGUEL · MI
          CUMPLEAÑOS · te espero» y llega hasta el borde de abajo. Una placa encima tapaba
          la última línea. Quien navega con teclado o lector de pantalla tiene el
          `aria-label` del botón, que es lo que de verdad lo anuncia. */}
    </button>
  )
}

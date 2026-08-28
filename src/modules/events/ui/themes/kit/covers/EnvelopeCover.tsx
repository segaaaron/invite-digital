'use client'

import { useState } from 'react'
import { prefiereMenosMovimiento } from '../motion'

type Props = {
  readonly accent: string
  readonly bg: string
  readonly textColor: string
  /** «Abrir invitación», del diccionario. */
  readonly label: string
  /** «Toca en cualquier lugar», del diccionario. */
  readonly hint: string
  /** El nombre accesible del botón: quien usa lector de pantalla no ve el sobre. */
  readonly openLabel: string
}

/**
 * La portada de sobre: se toca y se abre la invitación.
 *
 * Es un **`<button>` a pantalla completa**, no un `<div onClick>` como en la maqueta. Con
 * un div, quien navega con teclado no puede abrirla y quien usa lector de pantalla no oye
 * que haya nada que tocar: la invitación se acaba en la portada. Cuesta lo mismo y lo
 * arregla entero.
 *
 * Las portadas con fotografía y color propios de cada diseño **no viven aquí**: viven con
 * su tema. Traerlas al kit metería la paleta de un diseño en código que comparten los
 * dieciséis, que es justo lo que la guardia de hexadecimales impide.
 */
export function EnvelopeCover({ accent, bg, textColor, label, hint, openLabel }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [reducido] = useState(prefiereMenosMovimiento)

  if (abierta) return null

  return (
    <button
      aria-label={openLabel}
      onClick={() => setAbierta(true)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        cursor: 'pointer',
        background: bg,
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        width: '100%',
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <span style={{ textAlign: 'center' }}>
        <span
          aria-hidden
          style={{
            position: 'relative',
            display: 'block',
            width: 240,
            height: 160,
            margin: '0 auto',
            border: `1px solid ${accent}`,
            background: bg,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '55%',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              background: accent,
              opacity: 0.15,
              borderBottom: `1px solid ${accent}`,
              transformOrigin: 'center top',
              animation: reducido ? undefined : 'theme-envelopeFlap 2.4s ease-in-out infinite',
            }}
          />
          <span style={{ position: 'absolute', inset: '30% 24px 24px', border: `1px dashed ${accent}`, opacity: 0.5 }} />
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '60%',
              transform: 'translate(-50%, -50%)',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: accent,
              color: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-cormorant)',
              fontStyle: 'italic',
              fontSize: 16,
            }}
          >
            ✉
          </span>
        </span>

        <span
          style={{
            display: 'block',
            marginTop: 28,
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 10,
            letterSpacing: '0.4em',
            color: accent,
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 6,
            fontSize: 11,
            opacity: 0.5,
            letterSpacing: '0.2em',
            fontFamily: 'var(--font-jetbrains-mono)',
          }}
        >
          {hint}
        </span>
      </span>
    </button>
  )
}

'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  readonly bgAsset: string
  readonly accent: string
  readonly textColor: string
  /** «MIS XV AÑOS», del contenido del diseño. */
  readonly label: string
  readonly hint: string
  readonly openLabel: string
}

/**
 * La portada de una sola fotografía: la imagen a sangre y el rótulo abajo.
 *
 * Es la del palacio griego, donde la portada **es** la ilustración y cualquier panel encima
 * la estropea. Vive con los XV y no en el kit por lo mismo que las demás: la fotografía y
 * el color son de un diseño.
 *
 * Es un `<button>` a pantalla completa y no un `<div onClick>`: con un div, quien navega
 * con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function ImageOnlyCover({ bgAsset, accent, textColor, label, hint, openLabel }: Props) {
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
        border: 'none',
        padding: 0,
        width: '100%',
        color: textColor,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <span aria-hidden style={{ position: 'absolute', inset: 0 }}>
        <Image alt="" fill priority sizes="480px" src={bgAsset} style={{ objectFit: 'cover' }} />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 45%, rgba(20,15,8,0.55) 100%)',
          }}
        />
      </span>

      <span
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 56,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, letterSpacing: '0.5em', color: accent }}>{label}</span>
        <span style={{ fontSize: 10, letterSpacing: '0.3em', opacity: 0.8 }}>{hint}</span>
      </span>
    </button>
  )
}

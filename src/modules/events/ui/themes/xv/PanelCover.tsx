'use client'

import Image from 'next/image'
import { useState } from 'react'
import { prefiereMenosMovimiento } from '../kit/motion'

type Props = {
  readonly bgAsset: string
  /** La pieza que preside la portada: el marco, la máscara, la tiara, el sobre. */
  readonly emblemAsset?: string
  readonly bg: string
  readonly accent: string
  readonly textColor: string
  readonly eyebrow: string
  readonly title: string
  readonly name: string
  readonly openLabel: string
}

/**
 * La portada de los cinco diseños de XV con fondo fotográfico y panel: mascarada, bosque,
 * noche estrellada, gala y disco.
 *
 * Es la misma en los cinco —fotografía a sangre, velo, emblema, «XV AÑOS» y el nombre en
 * caligrafía—, así que vive una vez y recibe su piel por props. Vive con los XV y no en el
 * kit porque el resto de la colección no la usa.
 *
 * Es un `<button>` a pantalla completa, no un `<div onClick>`: con un div, quien navega
 * con teclado no puede abrirla y la invitación se acaba en la portada.
 */
export function PanelCover({ bgAsset, emblemAsset, bg, accent, textColor, eyebrow, title, name, openLabel }: Props) {
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
        overflow: 'hidden',
        background: bg,
        color: textColor,
        animation: reducido ? undefined : 'theme-introFade 800ms ease',
      }}
      type="button"
    >
      <Image alt="" aria-hidden fill priority sizes="100vw" src={bgAsset} style={{ objectFit: 'cover' }} />
      <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.42)' }} />

      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '40px 30px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 11,
            letterSpacing: '0.35em',
            color: accent,
            textShadow: '0 2px 8px rgba(0,0,0,.8)',
          }}
        >
          {eyebrow}
        </span>

        {emblemAsset === undefined ? null : (
          <Image
            alt=""
            aria-hidden
            height={220}
            src={emblemAsset}
            style={{ width: 200, height: 'auto', margin: '22px auto', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,.55))' }}
            width={200}
          />
        )}

        <span
          style={{
            fontFamily: 'var(--font-italiana)',
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: accent,
            textShadow: '0 2px 10px rgba(0,0,0,.8)',
          }}
        >
          {title} AÑOS
        </span>
        <span
          style={{
            fontFamily: 'var(--font-great-vibes)',
            fontSize: 62,
            color: textColor,
            marginTop: 10,
            lineHeight: 1,
            textShadow: '0 2px 12px rgba(0,0,0,.8)',
          }}
        >
          {name}
        </span>
      </span>
    </button>
  )
}
